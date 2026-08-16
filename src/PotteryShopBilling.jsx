import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Trash2,
  MessageCircle,
  Settings2,
  Copy,
  Check,
  RotateCcw,
  X,
  FileDown,
  Share2,
  Image as ImageIcon,
  ExternalLink,
  CheckCheck,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { LOGO_SRC } from './logo.js';

const VaseMark = ({ className }) => (
  <svg viewBox="0 0 24 32" className={className} fill="currentColor">
    <path d="M10,2 L14,2 L13,7 L18,11 L17,20 L14,27 L13,30 L11,30 L10,27 L7,20 L6,11 L11,7 Z" />
  </svg>
);

const fmt = (n) => {
  const val = Number(n) || 0;
  return val.toFixed(2).replace(/\.00$/, '');
};

// jsPDF default Helvetica font renders ₹ as superscript or broken glyph; use Rs. in PDF
const pdfMoney = (n) => `Rs. ${fmt(n)}`;

const DEFAULT_SHOP = {
  name: 'SK POTTERY EMPORIUM',
  tagline: 'A Story In Every Shape',
  address: '28th cross 1st Main road AK colony Varthur Bengaluru 560087',
  phone: '9986066454, 9902628946',
  currency: '₹',
  whatsappAccessToken: '',
  whatsappPhoneNumberId: '',
};

const BillReceiptPreview = ({
  shop,
  displayBillNo,
  today,
  customerName,
  validItems,
  subtotal,
  discountAmount,
  total,
}) => (
  <div
    id="bill-receipt-preview"
    className="bg-white rounded-lg border border-stone-200 p-6 text-[13px] leading-snug text-stone-800 font-sans shadow-sm"
  >
    <div className="relative mb-3 min-h-[52px]">
      <img
        src={LOGO_SRC}
        alt="Shop logo"
        className="absolute left-0 top-0 h-[52px] w-auto object-contain"
      />
      <div className="text-center px-14">
        <p className="text-base font-bold text-stone-900">{shop.name.trim() || 'Pottery Shop'}</p>
        {shop.tagline.trim() && (
          <p className="text-[11px] text-stone-500 mt-0.5">{shop.tagline.trim()}</p>
        )}
        {shop.address.trim() && (
          <p className="text-[10px] text-stone-500 mt-0.5 text-center leading-tight">
            {shop.address.trim()}
          </p>
        )}
        {shop.phone.trim() && (
          <p className="text-[11px] text-stone-500 mt-0.5">Phone: {shop.phone.trim()}</p>
        )}
      </div>
    </div>

    <div className="border-t border-stone-200 my-3" />

    <div className="flex justify-between text-[11px] text-stone-600 mb-1">
      <span>Bill No: {displayBillNo}</span>
      <span>Date: {today}</span>
    </div>
    {customerName.trim() && (
      <p className="text-[11px] text-stone-600 mb-1">Customer: {customerName.trim()}</p>
    )}

    <div className="border-t border-stone-200 my-3" />

    <div className="grid grid-cols-[1fr_44px_72px_72px] gap-x-2 text-[11px] font-bold text-stone-900 pb-1 border-b border-stone-200">
      <span>Item</span>
      <span className="text-right">Qty</span>
      <span className="text-right">Price</span>
      <span className="text-right">Amount</span>
    </div>

    {validItems.length === 0 ? (
      <p className="text-sm text-stone-400 italic py-6 text-center">No items added yet</p>
    ) : (
      <div className="divide-y divide-stone-100">
        {validItems.map((it) => {
          const lineTotal = Number(it.qty) * Number(it.price);
          return (
            <div
              key={it.id}
              className="grid grid-cols-[1fr_44px_72px_72px] gap-x-2 py-2 text-[12px] text-stone-700"
            >
              <span className="pr-2 break-words">{it.name.trim()}</span>
              <span className="text-right">{it.qty}</span>
              <span className="text-right whitespace-nowrap">{pdfMoney(it.price)}</span>
              <span className="text-right whitespace-nowrap">{pdfMoney(lineTotal)}</span>
            </div>
          );
        })}
      </div>
    )}

    <div className="border-t border-stone-200 my-3" />

    <div className="space-y-1 text-[12px] text-stone-500">
      <div className="grid grid-cols-[1fr_72px_72px] gap-x-2">
        <span />
        <span className="text-right">Subtotal</span>
        <span className="text-right">{pdfMoney(subtotal)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="grid grid-cols-[1fr_72px_72px] gap-x-2">
          <span />
          <span className="text-right">Discount</span>
          <span className="text-right">-{pdfMoney(discountAmount)}</span>
        </div>
      )}
      <div className="grid grid-cols-[1fr_72px_72px] gap-x-2 pt-1 text-[14px] font-bold text-teal-800">
        <span />
        <span className="text-right">Total</span>
        <span className="text-right">{pdfMoney(total)}</span>
      </div>
    </div>

    <div className="border-t border-stone-200 my-4" />
    <p className="text-center text-[11px] italic text-stone-400">Thank you for shopping with us!</p>
  </div>
);

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const triggerDownload = (file) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 300);
};

// Opens WhatsApp directly to the customer's number
const openWhatsAppChat = (phoneDigits, text = '') => {
  const phone = String(phoneDigits).replace(/\D/g, '');
  if (!phone) return;

  const params = new URLSearchParams({ phone });
  if (text) params.set('text', text);

  const isMobile = isMobileDevice();
  if (isMobile) {
    window.location.href = `whatsapp://send?${params.toString()}`;
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.open(`https://api.whatsapp.com/send?${params.toString()}`, '_blank');
      }
    }, 600);
    return;
  }

  const webUrl = `https://web.whatsapp.com/send?${params.toString()}`;
  window.open(webUrl, '_blank', 'noopener,noreferrer');
};

export default function PotteryShopBilling() {
  const [shop, setShop] = useState(DEFAULT_SHOP);
  const [showSettings, setShowSettings] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [shopSavedHint, setShopSavedHint] = useState(false);
  const shopHydratedRef = useRef(false);

  const [customerName, setCustomerName] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [customerPhone, setCustomerPhone] = useState('');

  const [items, setItems] = useState([{ id: 1, name: '', qty: '1', price: '' }]);
  const [nextId, setNextId] = useState(2);

  const [discountType, setDiscountType] = useState('flat');
  const [discountValue, setDiscountValue] = useState('');

  const [catalog, setCatalog] = useState([]);
  const [billCounter, setBillCounter] = useState(0);
  const [sentBanner, setSentBanner] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  const pdfCacheRef = useRef({ key: '', file: null, fileName: '', doc: null });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await window.storage.get('shop-profile');
        if (mounted && res && res.value) {
          const parsed = JSON.parse(res.value);
          setShop((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // use defaults
      }
      if (mounted) shopHydratedRef.current = true;
      try {
        const res = await window.storage.get('billing-data');
        if (mounted && res && res.value) {
          const parsed = JSON.parse(res.value);
          setCatalog(Array.isArray(parsed.catalog) ? parsed.catalog : []);
          setBillCounter(typeof parsed.counter === 'number' ? parsed.counter : 0);
        }
      } catch {
        // no billing history yet
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const saveShop = async (next) => {
    setSavingShop(true);
    try {
      await window.storage.set('shop-profile', JSON.stringify(next));
      setShopSavedHint(true);
      setTimeout(() => setShopSavedHint(false), 2000);
    } catch {
      // storage unavailable
    } finally {
      setSavingShop(false);
    }
  };

  useEffect(() => {
    if (!shopHydratedRef.current) return undefined;
    const timer = setTimeout(() => {
      saveShop(shop);
    }, 500);
    return () => clearTimeout(timer);
  }, [shop]);

  const handleShopField = (field, value) => {
    setShop((s) => ({ ...s, [field]: value }));
  };

  const handleShopSave = async () => {
    await saveShop(shop);
    setShowSettings(false);
  };

  const addItem = () => {
    setItems((prev) => [...prev, { id: nextId, name: '', qty: '1', price: '' }]);
    setNextId((n) => n + 1);
  };

  const removeItem = (id) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  };

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === 'name') {
          const match = catalog.find((c) => c.name.toLowerCase() === value.trim().toLowerCase());
          if (match && !it.price) {
            updated.price = String(match.price);
          }
        }
        return updated;
      }),
    );
  };

  const validItems = items.filter(
    (it) => it.name.trim() !== '' && Number(it.qty) > 0 && it.price !== '' && Number(it.price) >= 0,
  );
  const subtotal = validItems.reduce((sum, it) => sum + Number(it.qty) * Number(it.price), 0);

  const discountNum = Number(discountValue) || 0;
  const discountAmount =
    discountType === 'percent'
      ? Math.min(subtotal, subtotal * (discountNum / 100))
      : Math.min(subtotal, discountNum);

  const total = Math.max(0, subtotal - discountAmount);
  const currency = shop.currency || '₹';

  const digitsPhone = (countryCode + customerPhone).replace(/\D/g, '');
  const displayPhone = `+${countryCode} ${customerPhone.trim()}`;
  const phoneValid = customerPhone.replace(/\D/g, '').length >= 7;
  const canSend = phoneValid && validItems.length > 0;

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const displayBillNo = `#${String(billCounter + 1).padStart(4, '0')}`;

  const billCacheKey = useMemo(
    () =>
      `${displayBillNo}|${customerName}|${JSON.stringify(validItems)}|${subtotal}|${discountAmount}|${total}|${shop.name}`,
    [displayBillNo, customerName, validItems, subtotal, discountAmount, total, shop.name],
  );

  const buildBillText = () => {
    const lines = [];
    lines.push(`*${shop.name.trim() || 'Pottery Shop'}*`);
    if (shop.tagline.trim()) lines.push(shop.tagline.trim());
    if (shop.address.trim()) lines.push(shop.address.trim());
    if (shop.phone.trim()) lines.push(`Phone: ${shop.phone.trim()}`);
    lines.push('-----------------------------');
    lines.push(`Bill No: ${displayBillNo}`);
    lines.push(`Date: ${today}`);
    if (customerName.trim()) lines.push(`Customer: ${customerName.trim()}`);
    lines.push('-----------------------------');
    validItems.forEach((it, idx) => {
      const lineTotal = Number(it.qty) * Number(it.price);
      lines.push(`${idx + 1}. ${it.name.trim()}`);
      lines.push(`   ${it.qty} x ${currency}${it.price} = ${currency}${fmt(lineTotal)}`);
    });
    lines.push('-----------------------------');
    lines.push(`Subtotal: ${currency}${fmt(subtotal)}`);
    if (discountAmount > 0) {
      lines.push(`Discount: -${currency}${fmt(discountAmount)}`);
    }
    lines.push(`*Total: ${currency}${fmt(total)}*`);
    lines.push('-----------------------------');
    lines.push('');
    lines.push('Thank you for shopping with us! 🏺');
    return lines.join('\n');
  };

  const buildWhatsAppCaption = () => {
    const namePart = customerName.trim() ? `Hi ${customerName.trim()}, ` : 'Hi, ';
    const shopLabel = shop.name.trim() || 'SK POTTERY EMPORIUM';
    return `${namePart}here's your bill ${displayBillNo} from ${shopLabel} — Total: ${currency}${fmt(total)}. Thank you for shopping with us! 🏺`;
  };

  const buildBillPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 40;
    let y = 40;

    // Logo, top-left
    const logoW = 60;
    const logoH = 60 * (240 / 272);
    try {
      doc.addImage(LOGO_SRC, 'PNG', marginX, y, logoW, logoH);
    } catch {
      // logo embed failed
    }

    // Shop details centered
    const centerX = pageWidth / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text(shop.name.trim() || 'Pottery Shop', centerX, y + 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    let ty = y + 32;
    if (shop.tagline.trim()) {
      doc.text(shop.tagline.trim(), centerX, ty, { align: 'center' });
      ty += 14;
    }
    if (shop.address.trim()) {
      doc.text(shop.address.trim(), centerX, ty, { align: 'center' });
      ty += 14;
    }
    if (shop.phone.trim()) {
      doc.text(`Phone: ${shop.phone.trim()}`, centerX, ty, { align: 'center' });
      ty += 14;
    }

    y = Math.max(y + logoH, ty) + 14;
    doc.setDrawColor(210);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 20;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(`Bill No: ${displayBillNo}`, marginX, y);
    doc.text(`Date: ${today}`, pageWidth - marginX, y, { align: 'right' });
    y += 16;
    if (customerName.trim()) {
      doc.text(`Customer: ${customerName.trim()}`, marginX, y);
      y += 16;
    }

    y += 4;
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 20;

    // Items table header
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Item', marginX, y);
    doc.text('Qty', 340, y, { align: 'right' });
    doc.text('Price', 420, y, { align: 'right' });
    doc.text('Amount', pageWidth - marginX, y, { align: 'right' });
    y += 8;
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    validItems.forEach((it) => {
      const lineTotal = Number(it.qty) * Number(it.price);
      doc.text(it.name.trim(), marginX, y);
      doc.text(String(it.qty), 340, y, { align: 'right' });
      doc.text(pdfMoney(it.price), 420, y, { align: 'right' });
      doc.text(pdfMoney(lineTotal), pageWidth - marginX, y, { align: 'right' });
      y += 18;
    });

    y += 4;
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 20;

    doc.setTextColor(90, 90, 90);
    doc.text('Subtotal', 420, y, { align: 'right' });
    doc.text(pdfMoney(subtotal), pageWidth - marginX, y, { align: 'right' });
    y += 16;
    if (discountAmount > 0) {
      doc.text('Discount', 420, y, { align: 'right' });
      doc.text(`-${pdfMoney(discountAmount)}`, pageWidth - marginX, y, { align: 'right' });
      y += 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20, 90, 80);
    doc.text('Total', 420, y, { align: 'right' });
    doc.text(pdfMoney(total), pageWidth - marginX, y, { align: 'right' });
    y += 34;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(140, 140, 140);
    doc.text('Thank you for shopping with us!', pageWidth / 2, y, { align: 'center' });

    return doc;
  };

  const getPdfFile = () => {
    const fileName = `Bill-${displayBillNo.replace('#', '')}.pdf`;
    if (pdfCacheRef.current.key === billCacheKey && pdfCacheRef.current.file) {
      return { file: pdfCacheRef.current.file, doc: pdfCacheRef.current.doc, fileName };
    }
    const doc = buildBillPDF();
    const blob = doc.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    pdfCacheRef.current = { key: billCacheKey, file, fileName, doc };
    return { file, doc, fileName };
  };

  // Upload PDF with local API + direct tmpfiles fallback
  const uploadPdfAndGetUrl = async (file) => {
    try {
      const pdfBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/upload-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, fileName: file.name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) return data.url;
      }
    } catch {
      // fallback
    }

    // Direct browser upload fallback to tmpfiles.org
    try {
      const form = new FormData();
      form.append('file', file, file.name || 'Bill.pdf');
      const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: form,
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        if (uploadData?.status === 'success' && uploadData?.data?.url) {
          const pageUrl = String(uploadData.data.url);
          return pageUrl.includes('tmpfiles.org/')
            ? pageUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
            : pageUrl;
        }
      }
    } catch {
      // upload failed
    }
    return null;
  };

  const sendWhatsAppBillApi = async (file, caption) => {
    try {
      const cfgRes = await fetch('/api/send-whatsapp');
      let isConfigured = false;
      if (cfgRes.ok) {
        const { configured } = await cfgRes.json();
        isConfigured = Boolean(configured);
      }
      if (!isConfigured && (!shop.whatsappAccessToken || !shop.whatsappPhoneNumberId)) {
        return { ok: false, reason: 'not_configured' };
      }
    } catch {
      if (!shop.whatsappAccessToken || !shop.whatsappPhoneNumberId) {
        return { ok: false, reason: 'not_configured' };
      }
    }

    const pdfUrl = await uploadPdfAndGetUrl(file);
    if (!pdfUrl) return { ok: false, reason: 'upload' };

    const res = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: digitsPhone,
        pdfUrl,
        caption,
        fileName: file.name,
        whatsappAccessToken: shop.whatsappAccessToken || undefined,
        whatsappPhoneNumberId: shop.whatsappPhoneNumberId || undefined,
      }),
    });

    if (res.status === 503) return { ok: false, reason: 'not_configured' };
    if (!res.ok) return { ok: false, reason: 'send_failed' };
    return { ok: true };
  };

  const shareBillPdfToWhatsApp = async (file, caption) => {
    const pdfFile = new File([file], file.name || 'Bill.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    const attempts = [
      {
        files: [pdfFile],
        title: `Bill ${displayBillNo} - ${shop.name.trim() || 'Pottery Shop'}`,
        text: caption,
      },
      { files: [pdfFile], text: caption },
      { files: [pdfFile], title: `Bill ${displayBillNo}` },
      { files: [pdfFile] },
    ];

    let lastError;
    for (const payload of attempts) {
      if (navigator.canShare && !navigator.canShare(payload)) continue;
      try {
        await navigator.share(payload);
        return true;
      } catch (e) {
        if (e?.name === 'AbortError') throw e;
        lastError = e;
      }
    }
    throw lastError || new Error('Could not share PDF');
  };

  const persistAfterSend = async () => {
    const nameMap = new Map(catalog.map((c) => [c.name, c.price]));
    validItems.forEach((it) => {
      const key = it.name.trim();
      nameMap.delete(key);
      nameMap.set(key, it.price);
    });
    const newCatalog = Array.from(nameMap.entries())
      .map(([name, price]) => ({ name, price }))
      .slice(-30);
    setCatalog(newCatalog);
    try {
      await window.storage.set(
        'billing-data',
        JSON.stringify({ counter: billCounter, catalog: newCatalog }),
      );
    } catch {
      // storage unavailable
    }
  };

  const downloadPdfFile = (doc, fileName) => {
    try {
      const dataUri = doc.output('datauristring');
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
      }, 300);
    } catch {
      doc.save(fileName);
    }
  };

  // Main Send via WhatsApp Flow
  const handleSend = async () => {
    if (!canSend) return;
    setPdfBusy(true);

    try {
      const { file, fileName, doc } = getPdfFile();
      const caption = buildWhatsAppCaption();

      // Check if WhatsApp Cloud API is configured for direct automated sending
      const apiResult = await sendWhatsAppBillApi(file, caption);
      if (apiResult.ok) {
        await persistAfterSend();
        openWhatsAppChat(digitsPhone);
        setSentBanner(`✅ Bill PDF sent directly to ${displayPhone}!`);
        setTimeout(() => setSentBanner(''), 14000);
        return;
      }

      // Check if Web Share API with files is supported (primarily mobile & modern OS)
      const canWebShareFiles =
        typeof navigator !== 'undefined' &&
        !!navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }));

      if (canWebShareFiles && isMobileDevice()) {
        try {
          await shareBillPdfToWhatsApp(file, caption);
          await persistAfterSend();
          setSentBanner(`✅ WhatsApp opened with bill PDF attached for ${displayPhone}!`);
          setTimeout(() => setSentBanner(''), 14000);
          return;
        } catch (e) {
          if (e?.name === 'AbortError') return;
          // if share sheet fails or is cancelled, proceed to fallback
        }
      }

      // Desktop & Browser Flow:
      await persistAfterSend();

      // 1. Copy clean caption to clipboard
      try {
        await navigator.clipboard.writeText(caption);
      } catch {
        // clipboard unavailable
      }

      // 2. Immediately open WhatsApp chat for the entered customer number
      openWhatsAppChat(digitsPhone, caption);

      setSentBanner(`✅ WhatsApp opened for ${displayPhone}!`);
      setTimeout(() => setSentBanner(''), 14000);

    } catch (e) {
      console.error('handleSend error:', e);
      setSentBanner('Could not open WhatsApp. Please try again.');
      setTimeout(() => setSentBanner(''), 8000);
    } finally {
      setPdfBusy(false);
    }
  };

  const handleDownloadPDF = () => {
    if (validItems.length === 0) return;
    setPdfBusy(true);
    try {
      const { doc, fileName } = getPdfFile();
      downloadPdfFile(doc, fileName);
    } catch {
      setSentBanner('Could not generate PDF.');
      setTimeout(() => setSentBanner(''), 6000);
    }
    setPdfBusy(false);
  };

  const handleNewBill = () => {
    const nextCounter = billCounter + 1;
    setBillCounter(nextCounter);
    try {
      window.storage.set(
        'billing-data',
        JSON.stringify({ counter: nextCounter, catalog }),
      );
    } catch {
      // storage unavailable
    }
    setCustomerName('');
    setCustomerPhone('');
    setItems([{ id: nextId, name: '', qty: '1', price: '' }]);
    setNextId((n) => n + 1);
    setDiscountValue('');
    setSentBanner('');
  };

  return (
    <div className="min-h-screen w-full bg-stone-100 font-sans">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_SRC}
              alt="Shop logo"
              className="h-14 w-auto flex-shrink-0 object-contain"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 tracking-tight">
                {shop.name.trim() || 'Your Pottery Shop'}
              </h1>
              {shop.tagline.trim() && (
                <p className="text-stone-500 text-sm mt-0.5">{shop.tagline}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-stone-300 text-stone-600 hover:border-teal-700 hover:text-teal-700 transition-colors text-sm font-medium self-start shadow-sm"
          >
            <Settings2 className="w-4 h-4" />
            Shop Info
          </button>
        </div>

        {/* Shop Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif font-semibold text-stone-900 text-lg">Shop Details</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Shop Name</label>
                <input
                  value={shop.name}
                  onChange={(e) => handleShopField('name', e.target.value)}
                  placeholder="e.g. SK Pottery Emporium"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  Tagline (optional)
                </label>
                <input
                  value={shop.tagline}
                  onChange={(e) => handleShopField('tagline', e.target.value)}
                  placeholder="A Story in Every Shape"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Address</label>
                <input
                  value={shop.address}
                  onChange={(e) => handleShopField('address', e.target.value)}
                  placeholder="Shop address"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Shop Phone</label>
                <input
                  value={shop.phone}
                  onChange={(e) => handleShopField('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  Currency Symbol
                </label>
                <input
                  value={shop.currency}
                  onChange={(e) => handleShopField('currency', e.target.value)}
                  placeholder="₹"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>

            {/* Optional WhatsApp Cloud API settings */}
            <div className="mt-4 pt-4 border-t border-stone-200">
              <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                WhatsApp Cloud API (Optional for automated direct send)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">
                    Meta Access Token
                  </label>
                  <input
                    type="password"
                    value={shop.whatsappAccessToken || ''}
                    onChange={(e) => handleShopField('whatsappAccessToken', e.target.value)}
                    placeholder="EAAB..."
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">
                    Phone Number ID
                  </label>
                  <input
                    value={shop.whatsappPhoneNumberId || ''}
                    onChange={(e) => handleShopField('whatsappPhoneNumberId', e.target.value)}
                    placeholder="1092837465..."
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleShopSave}
              disabled={savingShop}
              className="mt-4 px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 disabled:opacity-60 transition-colors shadow-sm"
            >
              {savingShop ? 'Saving…' : shopSavedHint ? 'Saved' : 'Save Shop Details'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Bill Form */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <h2 className="font-serif font-semibold text-stone-900 mb-4 text-lg">New Bill</h2>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">
                  WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1.5">
                  <span className="inline-flex items-center px-2.5 py-2 rounded-lg border border-stone-300 bg-stone-50 text-xs text-stone-600 font-medium select-none">
                    +{countryCode}
                  </span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Items
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </button>
              </div>

              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={it.id} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-stone-400 w-4 text-center select-none">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={it.name}
                      onChange={(e) => updateItem(it.id, 'name', e.target.value)}
                      placeholder="Item name"
                      list="catalog-list"
                      className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-0"
                    />
                    <input
                      type="number"
                      min="1"
                      value={it.qty}
                      onChange={(e) => updateItem(it.id, 'qty', e.target.value)}
                      placeholder="Qty"
                      className="w-16 px-2.5 py-2 rounded-lg border border-stone-300 text-sm text-center focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <div className="relative w-24">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 select-none">
                        {currency}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.price}
                        onChange={(e) => updateItem(it.id, 'price', e.target.value)}
                        placeholder="Price"
                        className="w-full pl-6 pr-2.5 py-2 rounded-lg border border-stone-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        className="text-stone-400 hover:text-red-500 p-1.5"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <datalist id="catalog-list">
                {catalog.map((c, i) => (
                  <option key={i} value={c.name}>
                    {currency}
                    {c.price}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Discount */}
            <div className="mb-4 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-stone-600">Discount (optional)</span>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setDiscountType('flat')}
                      className={`px-2 py-1 rounded-md font-medium transition-colors ${
                        discountType === 'flat' ? 'bg-teal-700 text-white' : 'text-stone-600'
                      }`}
                    >
                      {currency} Flat
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`px-2 py-1 rounded-md font-medium transition-colors ${
                        discountType === 'percent' ? 'bg-teal-700 text-white' : 'text-stone-600'
                      }`}
                    >
                      % Percent
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percent' ? '10%' : '0'}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-stone-300 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-1 py-3 border-t border-stone-200 mb-4 text-sm text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  {currency}
                  {fmt(subtotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-teal-700">
                  <span>Discount</span>
                  <span>
                    -{currency}
                    {fmt(discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-stone-900 pt-1 border-t border-stone-100">
                <span>Total</span>
                <span>
                  {currency}
                  {fmt(total)}
                </span>
              </div>
            </div>

            {!phoneValid && customerPhone.length > 0 && (
              <p className="text-xs text-red-500 mb-2">Enter a valid 10-digit WhatsApp number</p>
            )}
            {validItems.length === 0 && (
              <p className="text-xs text-stone-400 mb-2">Add at least one item with price</p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend || pdfBusy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <MessageCircle className="w-5 h-5" />
                {pdfBusy ? 'Preparing PDF…' : 'Send via WhatsApp'}
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={validItems.length === 0 || pdfBusy}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-stone-100 text-stone-700 font-medium hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                title="Download PDF"
              >
                <FileDown className="w-4 h-4" />
                PDF
              </button>

              <button
                type="button"
                onClick={handleNewBill}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-stone-100 text-stone-700 font-medium hover:bg-stone-200 transition-colors text-sm"
                title="New Bill"
              >
                <RotateCcw className="w-4 h-4" />
                New
              </button>
            </div>

            {sentBanner && (
              <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>{sentBanner}</span>
              </div>
            )}
          </div>

          {/* Right: Bill Preview */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <div className="mb-3">
              <h2 className="font-serif font-semibold text-stone-900 text-lg">Bill Preview</h2>
              <p className="text-xs text-stone-400">Matches the exact PDF bill attachment</p>
            </div>
            <BillReceiptPreview
              shop={shop}
              displayBillNo={displayBillNo}
              today={today}
              customerName={customerName}
              validItems={validItems}
              subtotal={subtotal}
              discountAmount={discountAmount}
              total={total}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
