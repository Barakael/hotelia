<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\OutletStock;
use App\Models\Product;
use App\Models\StockIssue;
use App\Models\StockIssueItem;
use App\Models\StockMovement;
use App\Models\User;
use App\Support\Desk;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockIssueController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = StockIssue::with(['branch:id,name,outlet_type', 'issuer:id,name', 'receiver:id,name', 'items.product:id,name'])
            ->where('shop_id', $user->shop_id)
            ->orderByDesc('created_at');

        if (in_array($user->role, ['bar', 'fnb'], true)) {
            $ids = Desk::sellingBranchIds($user) ?? [];
            $query->where(function ($q) use ($user, $ids) {
                $q->where('issued_to', $user->id);
                if ($ids) {
                    $q->orWhereIn('to_branch_id', $ids);
                }
            });
        }

        return response()->json($query->limit(100)->get());
    }

    public function outlets(Request $request)
    {
        return response()->json(
            Branch::where('shop_id', $request->user()->shop_id)
                ->whereIn('outlet_type', ['bar', 'restaurant', 'bbq'])
                ->orderBy('name')
                ->get(['id', 'name', 'outlet_type'])
        );
    }

    public function receivers(Request $request)
    {
        $shopId = $request->user()->shop_id;

        return response()->json(
            User::where('shop_id', $shopId)
                ->whereIn('role', ['bar', 'fnb'])
                ->with('branch:id,name,outlet_type')
                ->get(['id', 'name', 'email', 'role', 'branch_id'])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'to_branch_id' => 'required|exists:branches,id',
            'issued_to' => 'required|exists:users,id',
            'note' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.qty' => 'required|integer|min:1',
        ]);

        $user = $request->user();

        $issue = DB::transaction(function () use ($data, $user) {
            $branch = Branch::where('shop_id', $user->shop_id)->findOrFail($data['to_branch_id']);
            if (! in_array($branch->outlet_type, ['bar', 'restaurant', 'bbq'], true)) {
                abort(422, 'Stock can only be issued to Bar, Restaurant, or BBQ.');
            }

            $receiver = User::where('shop_id', $user->shop_id)
                ->whereIn('role', ['bar', 'fnb'])
                ->findOrFail($data['issued_to']);

            if (! Desk::canReceiveIssue($receiver, $branch)) {
                abort(422, 'That person does not work this outlet.');
            }

            foreach ($data['items'] as $item) {
                $product = Product::where('shop_id', $user->shop_id)->lockForUpdate()->findOrFail($item['product_id']);
                if (! $product->is_sellable_transfer) {
                    abort(422, "{$product->name} is a store tool/supply and cannot be issued to outlet stock.");
                }
                $pending = StockIssueItem::where('product_id', $product->id)
                    ->whereHas('issue', fn ($q) => $q->where('shop_id', $user->shop_id)->where('status', 'pending'))
                    ->sum('qty');
                $available = $product->stock - (int) $pending;
                if ($available < $item['qty']) {
                    abort(422, "Not enough store stock for {$product->name}. Available: {$available}");
                }
            }

            $issue = StockIssue::create([
                'shop_id' => $user->shop_id,
                'to_branch_id' => $branch->id,
                'issued_by' => $user->id,
                'issued_to' => $receiver->id,
                'status' => 'pending',
                'note' => $data['note'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $issue->items()->create([
                    'product_id' => $item['product_id'],
                    'qty' => $item['qty'],
                ]);
            }

            return $issue->load(['branch', 'receiver:id,name', 'items.product:id,name']);
        });

        return response()->json($issue, 201);
    }

    public function acknowledge(Request $request, string $id)
    {
        $user = $request->user();

        $issue = DB::transaction(function () use ($id, $user) {
            $issue = StockIssue::with('items')
                ->where('shop_id', $user->shop_id)
                ->lockForUpdate()
                ->findOrFail($id);

            if ($issue->status !== 'pending') {
                abort(422, 'This issue is already '.$issue->status.'.');
            }

            $branch = Branch::findOrFail($issue->to_branch_id);
            $isReceiver = (int) $issue->issued_to === (int) $user->id
                || Desk::canReceiveIssue($user, $branch);
            if (! $isReceiver && $user->role !== 'owner') {
                abort(403, 'Only the assigned receiver can acknowledge this issue.');
            }

            foreach ($issue->items as $item) {
                $product = Product::where('shop_id', $user->shop_id)->lockForUpdate()->findOrFail($item->product_id);
                if ($product->stock < $item->qty) {
                    abort(422, "Store no longer has enough {$product->name}.");
                }
                $product->decrement('stock', $item->qty);

                $outlet = OutletStock::lockForUpdate()->firstOrCreate(
                    ['branch_id' => $issue->to_branch_id, 'product_id' => $product->id],
                    ['shop_id' => $user->shop_id, 'qty' => 0]
                );
                $outlet->increment('qty', $item->qty);

                StockMovement::create([
                    'shop_id' => $user->shop_id,
                    'product_id' => $product->id,
                    'branch_id' => null,
                    'type' => 'issue_out',
                    'qty' => -$item->qty,
                    'reference_type' => StockIssue::class,
                    'reference_id' => $issue->id,
                    'user_id' => $user->id,
                    'note' => 'Issued to '.$branch->name,
                ]);
                StockMovement::create([
                    'shop_id' => $user->shop_id,
                    'product_id' => $product->id,
                    'branch_id' => $issue->to_branch_id,
                    'type' => 'issue_in',
                    'qty' => $item->qty,
                    'reference_type' => StockIssue::class,
                    'reference_id' => $issue->id,
                    'user_id' => $user->id,
                    'note' => 'Acknowledged by '.$user->name,
                ]);
            }

            $issue->update([
                'status' => 'acknowledged',
                'acknowledged_at' => now(),
            ]);

            return $issue->fresh(['branch', 'receiver:id,name', 'items.product:id,name']);
        });

        return response()->json($issue);
    }

    public function reject(Request $request, string $id)
    {
        $user = $request->user();
        $issue = StockIssue::where('shop_id', $user->shop_id)->findOrFail($id);

        if ($issue->status !== 'pending') {
            abort(422, 'This issue is already '.$issue->status.'.');
        }

        $branch = Branch::findOrFail($issue->to_branch_id);
        if ((int) $issue->issued_to !== (int) $user->id && ! Desk::canReceiveIssue($user, $branch) && $user->role !== 'owner') {
            abort(403, 'Only the assigned receiver can reject this issue.');
        }

        $issue->update(['status' => 'rejected']);

        return response()->json($issue);
    }
}
