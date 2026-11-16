'use client';

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { Card } from '@/components/ui/card';
import { BookCover } from '@/components/features/book-cover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { BarcodeScanner } from '@/components/features/barcode-scanner';
import { useAppState, useRole, useToast } from '@/lib/context';
import { QrCode, Barcode, Printer, Search } from 'lucide-react';

function BarcodeView({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    JsBarcode(svgRef.current, value, { format: 'CODE128', displayValue: true, fontSize: 12, height: 48, margin: 0 });
  }, [value]);

  return <svg ref={svgRef} className="mx-auto max-w-full" aria-label={`Barcode ${value}`} />;
}

export default function BarcodePage() {
  const { books, members } = useAppState();
  const { currentRole } = useRole();
  const { toast } = useToast();
  const isLibraryStaff = currentRole === 'admin' || currentRole === 'librarian' || currentRole === 'staff';
  const [activeTab, setActiveTab] = useState('member');
  const [search, setSearch] = useState('');
  const [scannerCode, setScannerCode] = useState('');
  const [scanResult, setScanResult] = useState<{ type: 'book' | 'member'; label: string; code: string; href: string } | null>(null);
  const [qrItem, setQrItem] = useState<{ label: string; value: string } | null>(null);
  const [printItem, setPrintItem] = useState<{ label: string; value: string } | null>(null);

  const filteredMembers = members.filter(member =>
    !search || member.fullName.toLowerCase().includes(search.toLowerCase()) ||
    member.memberNumber.toLowerCase().includes(search.toLowerCase())
  );
  const filteredBooks = books.filter(book =>
    !search || book.title.toLowerCase().includes(search.toLowerCase()) ||
    book.bookCode.toLowerCase().includes(search.toLowerCase())
  );

  const lookupCode = (input: string) => {
    const code = input.trim().toUpperCase();
    if (!code) {
      toast('error', 'Masukkan kode barcode terlebih dahulu');
      return;
    }
    const book = books.find(item => item.bookCode.toUpperCase() === code);
    const member = members.find(item => item.memberNumber.toUpperCase() === code);
    if (book) {
      setScanResult({ type: 'book', label: book.title, code: book.bookCode, href: `/books/${book.id}` });
      return;
    }
    if (member) {
      setScanResult({ type: 'member', label: member.fullName, code: member.memberNumber, href: `/members/${member.id}` });
      return;
    }
    setScanResult(null);
    toast('warning', 'Kode tidak ditemukan', code);
  };

  const printLabels = (label: string, value: string) => setPrintItem({ label, value });

  if (!isLibraryStaff) {
    return (
      <AppLayout breadcrumbs={[{ label: 'Barcode & QR' }]} title="Akses Ditolak">
        <Card><p className="text-sm text-slate-600">Fitur barcode dan pemindaian tersedia untuk petugas perpustakaan.</p></Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumbs={[{ label: 'Barcode & QR' }]} title="Barcode & QR Code" description="Generate dan scan barcode untuk anggota dan buku">
      <Card padding="none" className="mb-6">
        <Tabs
          tabs={[{ id: 'member', label: 'Barcode Anggota' }, { id: 'book', label: 'Barcode Buku' }, { id: 'scanner', label: 'Scanner' }]}
          defaultTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="p-6">
          {(activeTab === 'member' || activeTab === 'book') && (
            <>
              <Input
                placeholder={activeTab === 'member' ? 'Cari anggota...' : 'Cari buku...'}
                icon={<Search className="w-4 h-4" />}
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="mb-4"
              />
              {activeTab === 'member' ? (
                filteredMembers.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Anggota tidak ditemukan.</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMembers.map(member => (
                      <div key={member.id} className="p-4 rounded-lg border border-slate-200 print:break-inside-avoid">
                        <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">{member.fullName.split(' ').map(part => part[0]).join('').substring(0, 2)}</div><div><p className="font-medium text-slate-900">{member.fullName}</p><p className="text-xs text-slate-500">{member.memberNumber}</p></div></div>
                        <div className="bg-white p-3 rounded border border-slate-200 mb-3"><BarcodeView value={member.memberNumber} /></div>
                        <div className="flex gap-2 print:hidden">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => printLabels(member.fullName, member.memberNumber)}><Printer className="w-3.5 h-3.5" /> Cetak</Button>
                          <Button size="sm" variant="outline" aria-label={`Tampilkan QR ${member.fullName}`} onClick={() => setQrItem({ label: member.fullName, value: member.memberNumber })}><QrCode className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                filteredBooks.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Buku tidak ditemukan.</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBooks.map(book => (
                      <div key={book.id} className="p-4 rounded-lg border border-slate-200 print:break-inside-avoid">
                        <div className="flex items-center gap-3 mb-3"><BookCover src={book.coverImage} alt={book.title} className="w-10 h-14 rounded object-cover" /><div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{book.title}</p><p className="text-xs text-slate-500">{book.bookCode}</p></div></div>
                        <div className="bg-white p-3 rounded border border-slate-200 mb-3"><BarcodeView value={book.bookCode} /></div>
                        <div className="flex gap-2 print:hidden">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => printLabels(book.title, book.bookCode)}><Printer className="w-3.5 h-3.5" /> Cetak</Button>
                          <Button size="sm" variant="outline" aria-label={`Tampilkan QR ${book.title}`} onClick={() => setQrItem({ label: book.title, value: book.bookCode })}><QrCode className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </>
          )}
          {activeTab === 'scanner' && (
            <div className="max-w-md mx-auto">
              <BarcodeScanner
                onDetected={code => {
                  setScannerCode(code);
                  lookupCode(code);
                }}
                onError={error => toast('error', 'Tidak dapat membuka kamera', error.message)}
              />
              <div className="flex gap-2">
                <Input placeholder="Scan atau ketik kode barcode..." value={scannerCode} onChange={event => setScannerCode(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') lookupCode(scannerCode); }} />
                <Button variant="outline" onClick={() => lookupCode(scannerCode)}>Cari</Button>
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">Izinkan akses kamera perangkat. Kamera memerlukan HTTPS atau localhost; input kode manual tetap tersedia.</p>
              {scanResult && <Card padding="sm" className="mt-4"><div className="flex items-center justify-between gap-3"><div><Badge variant="info">{scanResult.type === 'book' ? 'Buku' : 'Anggota'}</Badge><p className="font-medium mt-1">{scanResult.label}</p><p className="text-xs text-slate-500">{scanResult.code}</p></div><Barcode className="w-5 h-5 text-slate-400" /></div></Card>}
              {scanResult && (
                <Link
                  className="mt-3 block"
                  href={scanResult.href}
                >
                  <Button className="w-full" variant="outline">Buka {scanResult.type === 'book' ? 'Detail Buku' : 'Profil Anggota'}</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={qrItem !== null}
        onClose={() => setQrItem(null)}
        title="QR Code"
        footer={qrItem && (
          <>
            <Button variant="outline" onClick={() => setQrItem(null)}>Tutup</Button>
            <Button onClick={() => {
              setPrintItem(qrItem);
              setQrItem(null);
            }} icon={<Printer className="w-4 h-4" />}>Cetak Label</Button>
          </>
        )}
      >
        {qrItem && <div className="flex flex-col items-center gap-3 py-2"><p className="text-sm font-medium">{qrItem.label}</p><QRCodeSVG value={qrItem.value} size={220} includeMargin /><code className="text-xs text-slate-500">{qrItem.value}</code></div>}
      </Modal>

      <Modal
        isOpen={printItem !== null}
        onClose={() => setPrintItem(null)}
        title="Pratinjau Label Barcode & QR"
        footer={printItem && (
          <>
            <Button variant="outline" onClick={() => setPrintItem(null)}>Batal</Button>
            <Button onClick={() => window.print()} icon={<Printer className="w-4 h-4" />}>Cetak Label</Button>
          </>
        )}
      >
        {printItem && (
          <div className="printable-code-label flex flex-col items-center gap-3 py-2">
            <p className="text-center text-sm font-semibold">{printItem.label}</p>
            <BarcodeView value={printItem.value} />
            <QRCodeSVG value={printItem.value} size={180} includeMargin />
            <code className="text-xs">{printItem.value}</code>
          </div>
        )}
      </Modal>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .printable-code-label, .printable-code-label * { visibility: visible !important; }
          .printable-code-label {
            display: flex !important;
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            justify-content: center !important;
            background: white !important;
          }
        }
      `}</style>
    </AppLayout>
  );
}
