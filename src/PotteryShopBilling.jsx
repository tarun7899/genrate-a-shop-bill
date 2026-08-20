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
  Image as ImageIcon,
  ExternalLink,
  CheckCheck,
  FileText,
  AlertCircle,
  Users,
  UserCheck,
  Contact,
  Search,
  Smartphone,
  Sparkles,
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

const isContactPickerSupported = () =>
  typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const parseContactPhone = (rawPhone) => {
  if (!rawPhone) return { countryCode: '91', customerPhone: '' };
  // Remove non-digit characters
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return { countryCode: '91', customerPhone: '' };

  // Common Indian number parsing (+91 or leading 0)
  if (digits.startsWith('91') && digits.length === 12) {
    return { countryCode: '91', customerPhone: digits.slice(2) };
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return { countryCode: '91', customerPhone: digits.slice(1) };
  }
  if (digits.length === 10) {
    return { countryCode: '91', customerPhone: digits };
  }
  if (digits.length > 10) {
    return {
      countryCode: digits.slice(0, digits.length - 10),
      customerPhone: digits.slice(-10),
    };
  }
  return { countryCode: '91', customerPhone: digits };
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

// Opens WhatsApp directly to the customer's specific number
const openWhatsAppChat = (phoneDigits, text = '') => {
  const phone = String(phoneDigits).replace(/\D/g, '');
  if (!phone) return;

  const encodedText = encodeURIComponent(text);
  const isMobile = isMobileDevice();

  if (isMobile) {
    // Universal WhatsApp link: directly opens entered customer number chat on Android / iOS
    window.location.href = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
    return;
  }

  const webUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
  window.open(webUrl, '_blank', 'noopener,noreferrer');
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

  // Customer directory / Saved Contacts State
  const [savedContacts, setSavedContacts] = useState([]);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

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
      try {
        const cRes = await window.storage.get('customer-contacts');
        if (mounted && cRes && cRes.value) {
          const parsedContacts = JSON.parse(cRes.value);
          if (Array.isArray(parsedContacts)) {
            setSavedContacts(parsedContacts);
          }
        }
      } catch {
        // no saved contacts yet
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

  const saveCustomerToContacts = async (name, phone, cCode = '91') => {
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (!cleanPhone && !name.trim()) return;

    setSavedContacts((prev) => {
      const filtered = prev.filter(
        (c) => !(c.phone === cleanPhone && c.countryCode === cCode),
      );
      const updated = [
        {
          name: name.trim() || 'Customer',
          phone: cleanPhone,
          countryCode: cCode,
          lastBilledAt: Date.now(),
        },
        ...filtered,
      ].slice(0, 100);

      try {
        window.storage.set('customer-contacts', JSON.stringify(updated));
      } catch {
        // storage unavailable
      }
      return updated;
    });
  };

  const deleteSavedContact = async (phoneToDelete, cCode) => {
    setSavedContacts((prev) => {
      const updated = prev.filter(
        (c) => !(c.phone === phoneToDelete && c.countryCode === cCode),
      );
      try {
        window.storage.set('customer-contacts', JSON.stringify(updated));
      } catch {
        // storage unavailable
      }
      return updated;
    });
  };

  // Device Native Contact Picker Handler (navigator.contacts.select)
  const handlePickDeviceContact = async () => {
    if (isContactPickerSupported()) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const results = await navigator.contacts.select(props, opts);
        if (results && results.length > 0) {
          const selected = results[0];
          const name = (selected.name && selected.name[0]) || '';
          const rawTel = (selected.tel && selected.tel[0]) || '';

          if (name) {
            setCustomerName(name);
          }
          if (rawTel) {
            const parsed = parseContactPhone(rawTel);
            if (parsed.countryCode) setCountryCode(parsed.countryCode);
            setCustomerPhone(parsed.customerPhone);
          }

          if (name || rawTel) {
            await saveCustomerToContacts(
              name,
              rawTel ? parseContactPhone(rawTel).customerPhone : '',
              rawTel ? parseContactPhone(rawTel).countryCode : '91',
            );
          }

          setSentBanner(`✅ Selected contact: ${name || rawTel}`);
          setTimeout(() => setSentBanner(''), 4000);
          setShowContactsModal(false);
          return;
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.warn('Device Contact Picker failed or cancelled:', err);
        }
      }
    }
    // If device contact picker not supported or cancelled, show saved contacts modal
    setShowContactsModal(true);
  };

  const handleSelectSavedContact = (contact) => {
    if (contact.name) setCustomerName(contact.name);
    if (contact.countryCode) setCountryCode(contact.countryCode);
    if (contact.phone) setCustomerPhone(contact.phone);
    setShowContactsModal(false);
    setSentBanner(`✅ Loaded customer: ${contact.name || contact.phone}`);
    setTimeout(() => setSentBanner(''), 4000);
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
  const canSend = validItems.length > 0;

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

    // Digital signature seal (text-based stamp)
    // Note: jsPDF needs an image as base64/dataURI for exact seal rendering.
    // If you want exact PNG stamp, tell me and we can embed it as base64 in `src`.
    const sealW = 250;
    const sealH = 58;
    const sealX = pageWidth / 2 - sealW / 2;
    const sealTopY = y - 8;

    doc.setDrawColor(170, 0, 0);
    doc.setLineWidth(1);
    doc.rect(sealX, sealTopY, sealW, sealH);

    const sealCX = sealX + sealW / 2;

    // Shadow (for a stamped feel)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text('SK POTTERY EMPORIUM', sealCX + 1, sealTopY + 18 + 1, { align: 'center' });
    doc.setFontSize(10);
    doc.text('28th Cross, Varthur,', sealCX + 1, sealTopY + 32 + 1, { align: 'center' });
    doc.text('Bangalore - 560 087.', sealCX + 1, sealTopY + 46 + 1, { align: 'center' });

    // Main red stamp text
    doc.setTextColor(185, 0, 0);
    doc.setFontSize(12);
    doc.text('SK POTTERY EMPORIUM', sealCX, sealTopY + 18, { align: 'center' });
    doc.setFontSize(10);
    doc.text('28th Cross, Varthur,', sealCX, sealTopY + 32, { align: 'center' });
    doc.text('Bangalore - 560 087.', sealCX, sealTopY + 46, { align: 'center' });

    // Thank you line below stamp
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(140, 140, 140);
    doc.text('Thank you for shopping with us!', pageWidth / 2, sealTopY + sealH + 14, { align: 'center' });

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

  useEffect(() => {
    if (validItems.length === 0) return undefined;
    try {
      getPdfFile();
    } catch {
      // PDF pre-cache is best-effort
    }
    return undefined;
  }, [billCacheKey, validItems.length]);

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

  const shareBillPdfPicker = async (file, fileName, caption) => {
    const pdfFile = new File([file], fileName || 'Bill.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    if (typeof navigator === 'undefined' || !navigator.share) {
      throw new Error('Share not supported');
    }

    const withCaption = { files: [pdfFile], text: caption };
    const fileOnly = { files: [pdfFile] };
    const attempts = caption ? [withCaption, fileOnly] : [fileOnly];

    let lastError;
    for (const payload of attempts) {
      if (navigator.canShare && !navigator.canShare(payload)) continue;
      try {
        await navigator.share(payload);
        return;
      } catch (e) {
        if (e?.name === 'AbortError') throw e;
        lastError = e;
      }
    }
    throw lastError || new Error('Could not open share picker');
  };

  // Generate PDF, then open phone share picker (choose WhatsApp → customer → Send)
  const handleSendViaWhatsApp = async () => {
    if (validItems.length === 0) return;
    setPdfBusy(true);

    try {
      const { file, fileName } = getPdfFile();
      const caption = buildWhatsAppCaption();

      await shareBillPdfPicker(file, fileName, caption);

      await persistAfterSend();
      if (customerPhone || customerName) {
        await saveCustomerToContacts(customerName, customerPhone, countryCode);
      }
      setSentBanner(
        phoneValid
          ? `Choose WhatsApp, select ${displayPhone}, then tap Send.`
          : 'Choose WhatsApp, select customer, then tap Send.',
      );
      setTimeout(() => setSentBanner(''), 14000);
    } catch (e) {
      if (e?.name === 'AbortError') return;

      // Cloud API fallback — auto-sends PDF to entered number when configured
      if (phoneValid) {
        try {
          const { file } = getPdfFile();
          const caption = buildWhatsAppCaption();
          const apiResult = await sendWhatsAppBillApi(file, caption);
          if (apiResult.ok) {
            await persistAfterSend();
            await saveCustomerToContacts(customerName, customerPhone, countryCode);
            openWhatsAppChat(digitsPhone);
            setSentBanner(`Bill PDF sent to ${displayPhone}. WhatsApp opened.`);
            setTimeout(() => setSentBanner(''), 14000);
            return;
          }
        } catch {
          // fall through
        }
      }

      setSentBanner('Could not open share picker. Use HTTPS link on your phone and try again.');
      setTimeout(() => setSentBanner(''), 10000);
    } finally {
      setPdfBusy(false);
    }
  };

  const handleSharePdfToContacts = handleSendViaWhatsApp;

  // Open WhatsApp chat with entered number (text only — use Send via WhatsApp for PDF)
  const handleDirectWhatsApp = async () => {
    if (!phoneValid || validItems.length === 0) return;
    setPdfBusy(true);

    try {
      const { file } = getPdfFile();
      const caption = buildWhatsAppCaption();
      await persistAfterSend();
      await saveCustomerToContacts(customerName, customerPhone, countryCode);

      const apiResult = await sendWhatsAppBillApi(file, caption);
      if (apiResult.ok) {
        openWhatsAppChat(digitsPhone);
        setSentBanner(`Bill PDF sent to ${displayPhone}. WhatsApp opened.`);
        setTimeout(() => setSentBanner(''), 14000);
        return;
      }

      openWhatsAppChat(digitsPhone, caption);
      setSentBanner(`WhatsApp opened for ${displayPhone}. Use "Send via WhatsApp" to attach PDF.`);
      setTimeout(() => setSentBanner(''), 14000);
    } catch (e) {
      console.error('handleDirectWhatsApp error:', e);
      setSentBanner('Could not open WhatsApp.');
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
      if (customerPhone || customerName) {
        saveCustomerToContacts(customerName, customerPhone, countryCode);
      }
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

  const filteredSavedContacts = useMemo(() => {
    if (!contactSearchQuery.trim()) return savedContacts;
    const q = contactSearchQuery.toLowerCase().trim();
    return savedContacts.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)),
    );
  }, [savedContacts, contactSearchQuery]);

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
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() => setShowContactsModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-stone-300 text-stone-700 hover:border-teal-700 hover:text-teal-700 transition-colors text-sm font-medium shadow-sm"
              title="Saved Contacts & Customer History"
            >
              <Users className="w-4 h-4 text-teal-700" />
              <span>Contacts</span>
              {savedContacts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[11px] font-semibold rounded-full">
                  {savedContacts.length}
                </span>
              )}
            </button>
          <button
            onClick={() => setShowSettings((s) => !s)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-stone-300 text-stone-600 hover:border-teal-700 hover:text-teal-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Settings2 className="w-4 h-4" />
            Shop Info
          </button>
          </div>
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

        {/* Saved Contacts & Customer History Modal */}
        {showContactsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-100 text-teal-800">
                    <Contact className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-stone-900 text-base">Select Customer</h3>
                    <p className="text-xs text-stone-500">Pick from contacts or past billing history</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowContactsModal(false)}
                  className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action: Pick from Phone Contacts directly */}
              <div className="p-4 bg-teal-50/70 border-b border-teal-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-teal-900 text-xs font-medium">
                  <Smartphone className="w-4 h-4 text-teal-700 flex-shrink-0" />
                  <span>Access contacts from your phone or device</span>
                </div>
                <button
                  onClick={handlePickDeviceContact}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Pick from Phone Contacts
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-stone-200">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    placeholder="Search by customer name or phone..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                  {contactSearchQuery && (
                    <button
                      onClick={() => setContactSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contacts List */}
              <div className="p-3 overflow-y-auto flex-1 divide-y divide-stone-100">
                {filteredSavedContacts.length === 0 ? (
                  <div className="py-10 text-center text-stone-400">
                    <Users className="w-10 h-10 mx-auto text-stone-300 mb-2 stroke-[1.5]" />
                    <p className="text-sm font-medium text-stone-600">No saved contacts yet</p>
                    <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                      Customers you bill or pick from your phone will automatically appear here for quick access!
                    </p>
                  </div>
                ) : (
                  filteredSavedContacts.map((c, i) => (
                    <div
                      key={`${c.phone}-${i}`}
                      className="py-2.5 px-2 rounded-xl hover:bg-stone-50 transition-colors flex items-center justify-between gap-3 group"
                    >
                      <button
                        onClick={() => handleSelectSavedContact(c)}
                        className="flex items-center gap-3 text-left flex-1 min-w-0"
                      >
                        <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-900 truncate">
                            {c.name || 'Unnamed Customer'}
                          </p>
                          <p className="text-xs text-stone-500">
                            +{c.countryCode || '91'} {c.phone}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSelectSavedContact(c)}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-700 hover:text-white text-teal-800 text-xs font-semibold rounded-lg transition-all"
                        >
                          Select
                        </button>
                        <button
                          onClick={() => deleteSavedContact(c.phone, c.countryCode)}
                          className="p-1.5 text-stone-300 hover:text-red-500 rounded-lg transition-colors"
                          title="Remove from saved contacts"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-xs text-stone-500">
                <span>{savedContacts.length} saved contact{savedContacts.length === 1 ? '' : 's'}</span>
                <button
                  onClick={() => setShowContactsModal(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Bill Form */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif font-semibold text-stone-900 text-lg">New Bill</h2>
              <button
                type="button"
                onClick={handlePickDeviceContact}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-semibold transition-all shadow-sm"
                title="Pick contact from your phone or address book"
              >
                <Contact className="w-3.5 h-3.5 text-teal-700" />
                <span>Pick from Contacts</span>
              </button>
            </div>

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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-stone-500">
                    WhatsApp Number
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowContactsModal(true)}
                    className="text-[11px] text-teal-700 hover:underline font-medium flex items-center gap-0.5"
                  >
                    <Users className="w-3 h-3" />
                    History
                  </button>
                </div>
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

            {validItems.length === 0 && (
              <p className="text-xs text-stone-400 mb-2">Add at least one item with price</p>
            )}
            {validItems.length > 0 && isMobileDevice() && (
              <p className="text-xs text-stone-500 mb-2">
                Creates the PDF, opens share picker → choose WhatsApp → pick{' '}
                {phoneValid ? displayPhone : 'customer'} → tap Send.
              </p>
            )}

            {/* Action Buttons Toolbar */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSendViaWhatsApp}
                disabled={validItems.length === 0 || pdfBusy}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold hover:from-emerald-700 hover:to-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.99]"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{pdfBusy ? 'Preparing Bill PDF…' : 'Send via WhatsApp'}</span>
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleDirectWhatsApp}
                  disabled={!phoneValid || validItems.length === 0 || pdfBusy}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-800 font-medium hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
                  title="Open WhatsApp chat for entered number (text only)"
                >
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  <span>Open Chat</span>
                </button>

                {/* Download PDF */}
                <button
                  type="button"
                onClick={handleDownloadPDF}
                disabled={validItems.length === 0 || pdfBusy}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-medium hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
                  title="Download PDF"
              >
                <FileDown className="w-4 h-4" />
                  <span>Download</span>
              </button>

                {/* Reset / New Bill */}
              <button
                  type="button"
                onClick={handleNewBill}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-medium hover:bg-stone-200 transition-colors text-xs"
                  title="New Bill"
              >
                <RotateCcw className="w-4 h-4" />
                  <span>New Bill</span>
              </button>
              </div>
            </div>

            {sentBanner && (
              <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                <CheckCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>{sentBanner}</span>
              </div>
            )}
          </div>

          {/* Right: Bill Preview */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-serif font-semibold text-stone-900 text-lg">Bill Preview</h2>
                <p className="text-xs text-stone-400">Exact layout that generates in the PDF attachment</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-semibold">
                {displayBillNo}
              </span>
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
