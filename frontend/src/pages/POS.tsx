import { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { formatCurrency } from '@/data/mockData';
import { Sale } from '@/types';
import BarcodeScanner from '@/components/BarcodeScanner';
import {
  Camera, Keyboard, Trash2, Plus, Minus, CreditCard,
  Banknote, Smartphone, Printer, Check, Search, ShoppingCart, BedDouble
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { settingsApi, roomsApi, OccupiedRoom } from '@/services/api';
import { printReceipt, ReceiptShopInfo } from '@/lib/receiptPrint';

interface ApiShopInfo {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

const POS = () => {
  const { user } = useAuth();
  const { products, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, completeSale } = useStore();
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showRoomCharge, setShowRoomCharge] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { data: occupiedRooms = [] } = useQuery<OccupiedRoom[]>({
    queryKey: ['occupied-rooms'],
    queryFn: roomsApi.occupiedWithFolios,
  });

  const { data: shopSettings } = useQuery<ApiShopInfo>({
    queryKey: ['my-shop'],
    queryFn: () => settingsApi.get(),
  });

  const receiptShop: ReceiptShopInfo = {
    name: shopSettings?.name?.trim() || 'Shop',
    address: shopSettings?.address,
    phone: shopSettings?.phone,
  };

  const itemCount = cart.reduce((n, item) => n + item.quantity, 0);
  const grandTotal = cartTotal;
  const hasItems = itemCount > 0;

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (itemCount === 0) setCartOpen(false);
  }, [itemCount]);

  const handleBarcodeScan = (barcode: string) => {
    if (!barcode.trim()) return;
    const product = addToCart(barcode.trim());
    if (product) {
      toast.success(`Added: ${product.name}`);
    } else {
      toast.error('Product not found or out of stock');
    }
    setBarcodeInput('');
    barcodeRef.current?.focus();
  };

  const handleCheckout = async (
    method: 'cash' | 'card' | 'mobile' | 'room',
    extras?: { folio_id?: number; room_id?: number }
  ) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    try {
      const sale = await completeSale(method, user!.id, user!.name, extras);
      setCartOpen(false);
      setShowRoomCharge(false);
      setLastSale(sale);
      setShowReceipt(true);
      toast.success(method === 'room' ? 'Charged to room folio!' : 'Sale completed!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete sale.');
    }
  };

  const handlePrint = () => {
    if (!lastSale) return;
    const ok = printReceipt(lastSale, receiptShop);
    if (!ok) {
      toast.error('Pop-up blocked. Allow pop-ups for this site, then tap Print again.');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode.includes(searchQuery)
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 h-auto lg:h-[calc(100vh-6rem)] pb-24">
        {/* Product Grid & Scanner — full width */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Barcode Input Bar */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={barcodeRef}
                placeholder="Scan or type barcode..."
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBarcodeScan(barcodeInput)}
                className="pl-10 font-mono"
              />
            </div>

            <Button onClick={() => setShowScanner(true)} variant="outline" size="icon">
              <Camera className="w-4 h-4" />
            </Button>
          </div>

          {/* Product Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 content-start">
            {filteredProducts.map(product => (
              <motion.button
                key={product.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const p = addToCart(product.barcode);
                  if (p) toast.success(`Added: ${p.name}`);
                  else toast.error('Out of stock');
                }}
                className="glass-card rounded-xl p-4 text-left hover:border-primary/50 transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono text-muted-foreground">{product.barcode.slice(-6)}</span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    product.stock <= product.lowStockThreshold
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-accent text-accent-foreground'
                  }`}>
                    {product.stock}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground mb-1 line-clamp-2">{product.name}</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(product.price)}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating cart FAB — bottom right */}
      <button
        type="button"
        disabled={!hasItems}
        aria-disabled={!hasItems}
        aria-label={hasItems ? `Open cart, ${itemCount} items` : 'Cart is empty'}
        onClick={() => {
          if (!hasItems) return;
          setCartOpen(true);
        }}
        className={cn(
          'fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-all',
          hasItems
            ? 'bg-[#007AAD] hover:bg-[#E6A600] cursor-pointer hover:scale-105 active:scale-95'
            : 'bg-[#FDE68A] opacity-70 cursor-not-allowed pointer-events-none'
        )}
      >
        <ShoppingCart
          className={cn('w-7 h-7', hasItems ? 'text-white' : 'text-yellow-700/60')}
        />
        {hasItems && (
          <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#007AAD] text-white text-[11px] font-bold flex items-center justify-center leading-none shadow">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </button>

      {/* Cart sheet */}
      <Sheet open={cartOpen && hasItems} onOpenChange={(open) => hasItems && setCartOpen(open)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col p-0 gap-0"
        >
          <SheetHeader className="p-4 border-b border-border text-left space-y-1">
            <div className="flex items-center justify-between pr-8">
              <SheetTitle>Current Sale</SheetTitle>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-destructive hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
            <SheetDescription>
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-auto p-4 space-y-2 min-h-0">
            <AnimatePresence>
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Scan items to begin
                </div>
              ) : (
                cart.map(item => (
                  <motion.div
                    key={item.product.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(item.product.price)} each</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-secondary flex items-center justify-center hover:bg-secondary/80"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-mono w-6 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        className="w-6 h-6 rounded bg-secondary flex items-center justify-center hover:bg-secondary/80"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-foreground w-20 text-right">
                      {formatCurrency(item.product.price * item.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="border-t border-border p-4 space-y-3 mt-auto">
            <div className="flex justify-between text-lg font-bold text-foreground">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => handleCheckout('cash')} className="flex-col h-14 gap-1" disabled={cart.length === 0}>
                <Banknote className="w-4 h-4" />
                <span className="text-xs">Cash</span>
              </Button>
              <Button onClick={() => handleCheckout('card')} variant="secondary" className="flex-col h-14 gap-1" disabled={cart.length === 0}>
                <CreditCard className="w-4 h-4" />
                <span className="text-xs">Card</span>
              </Button>
              <Button onClick={() => handleCheckout('mobile')} variant="secondary" className="flex-col h-14 gap-1" disabled={cart.length === 0}>
                <Smartphone className="w-4 h-4" />
                <span className="text-xs">Mobile</span>
              </Button>
              <Button
                onClick={() => setShowRoomCharge(true)}
                variant="secondary"
                className="flex-col h-14 gap-1"
                disabled={cart.length === 0 || occupiedRooms.length === 0}
              >
                <BedDouble className="w-4 h-4" />
                <span className="text-xs">To room</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showRoomCharge} onOpenChange={setShowRoomCharge}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Charge to room</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {occupiedRooms.length === 0 && (
              <p className="text-sm text-muted-foreground">No occupied rooms with open folios.</p>
            )}
            {occupiedRooms.map((r) => (
              <button
                key={r.folio_id}
                type="button"
                className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors"
                onClick={() => handleCheckout('room', { folio_id: r.folio_id, room_id: r.id })}
              >
                <p className="font-semibold">Room {r.number}</p>
                <p className="text-xs text-muted-foreground">{r.guest_name} · {r.room_type}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Scanner Dialog */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Camera Scanner
            </DialogTitle>
          </DialogHeader>
          <BarcodeScanner
            active={showScanner}
            onScan={(barcode) => {
              setShowScanner(false);
              const product = addToCart(barcode);
              if (product) {
                toast.success(`Added: ${product.name}`);
              } else {
                toast.error(`Barcode ${barcode} not found or out of stock`);
              }
            }}
            onError={(msg) => toast.error(msg)}
          />
          <p className="text-xs text-muted-foreground text-center">
            Hold the barcode steady inside the frame.
          </p>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Sale Complete
            </DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div id="print-receipt" className="print-receipt font-mono">
              <div className="text-center border-b border-dashed border-border pb-4 mb-4 space-y-1">
                <h3 className="text-lg font-bold text-foreground leading-tight">{receiptShop.name}</h3>
                {receiptShop.address?.trim() && (
                  <p className="text-sm text-muted-foreground">{receiptShop.address}</p>
                )}
                {receiptShop.phone?.trim() && (
                  <p className="text-sm text-muted-foreground">TEL : {receiptShop.phone}</p>
                )}
                <p className="text-sm text-muted-foreground pt-2">Receipt #{lastSale.id}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(lastSale.timestamp).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Cashier: {lastSale.cashierName}</p>
              </div>

              <div className="space-y-2 border-b border-dashed border-border pb-4 mb-4">
                {lastSale.items.map(item => (
                  <div key={item.product.id} className="flex justify-between text-sm gap-2">
                    <div className="min-w-0">
                      <p className="text-foreground">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} x {formatCurrency(item.product.price)}
                      </p>
                    </div>
                    <span className="font-mono text-foreground shrink-0">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-sm mb-4">
                <div className="flex justify-between font-bold text-foreground text-base">
                  <span>TOTAL</span>
                  <span>{formatCurrency(lastSale.total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Payment</span>
                  <span className="capitalize">{lastSale.paymentMethod}</span>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground space-y-0.5">
                <p>Thank you for your purchase!</p>
                <p className="font-medium text-foreground/70">Powered by Hotelia</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button onClick={handlePrint} className="flex-1 gap-2">
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
            <Button onClick={() => setShowReceipt(false)} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default POS;
