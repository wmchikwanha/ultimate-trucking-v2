import { useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Check, ChevronDown, FileText, Loader2, Search, Trash2, Upload, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import { applicableDocuments, type DocumentType, type Requirement } from '@/lib/document-register';
import { useDocumentRegister } from '@/lib/document-register-query';
import { viewSupplierDocument } from '@/lib/document-register.functions';
import { isExpired, type Draft } from '@/lib/onboarding/model';
import type { Taxonomy } from '@/lib/taxonomy';
import { inputCls, Field } from './fields';
import { DocExtractionReview } from './AiReview';

type Props = {
 draft: Draft; tax: Taxonomy; checking: string[];
 addDocument: (file:File,type:string,expiry:string|null) => Promise<string|null>;
 removeDocument: (id:string) => Promise<string|null>;
};
const groups: Requirement[] = ['required','conditional','optional'];
const legacy = ['national_id','company_registration','trade_certificate','safety_certificate'];

export function DocumentChecklist({draft,tax,checking,addDocument,removeDocument}:Props) {
 const t=useT();
 const q=useDocumentRegister();
 const view=useServerFn(viewSupplierDocument);
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState<DocumentType|null>(null);
 const [file,setFile]=useState<File|null>(null);
 const [expires,setExpires]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [preview,setPreview]=useState<{name:string;url:string;pdf:boolean}|null>(null);
 const uploadRef=useRef<HTMLDivElement>(null);
 const fileRef=useRef<HTMLInputElement>(null);
 const types=q.data?.types ?? [];
 const docs=applicableDocuments(types,q.data?.overrides ?? [],draft.business.countryCode,draft.trade.kind);
 const name=(d:DocumentType) => legacy.includes(d.code) ? t(`register.legacy.${d.code}`) : d.local_name;
 const query=search.trim().toLocaleLowerCase();
 const visible=docs.filter(d => !query || `${name(d)} ${d.local_name} ${d.code} ${d.issuer}`.toLocaleLowerCase().includes(query));
 const country=tax.countries.find(c=>c.iso2===draft.business.countryCode)?.name ?? draft.business.countryCode;
 const required=docs.filter(d=>d.effectiveRequirement==='required');
 const attached=required.filter(d=>draft.documents.some(x=>x.docType===d.code)).length;

 function select(d:DocumentType) {
  setSelected(d); setFile(null); setExpires(''); setError(null);
  if(fileRef.current) fileRef.current.value='';
  requestAnimationFrame(()=>uploadRef.current?.scrollIntoView({behavior:'smooth',block:'center'}));
 }
 async function add() {
  if(!selected || !file) return;
  setBusy(true); setError(null);
  try {
   const err=await addDocument(file,selected.code,selected.validity_rule==='no_expiry' ? null : expires || null);
   setError(err);
   if(!err) {setFile(null);setSelected(null); if(fileRef.current) fileRef.current.value='';}
  } catch {setError('register.save_failed');}
  finally {setBusy(false);}
 }
 async function open(id:string,fileName:string) {
  setError(null);
  try {const result=await view({data:{documentId:id}}); if(result.url) setPreview({name:fileName,url:result.url,pdf:/\.pdf$/i.test(fileName)}); else setError('register.load_failed');}
  catch {setError('register.load_failed');}
 }
 return <section className="space-y-5" aria-label={t('register.documents')}>
  <div className="border-b border-border pb-4">
   <h2 className="flex items-center gap-2 text-lg font-bold text-primary"><FileText className="h-5 w-5"/>{t('register.checklist')}</h2>
   <p className="mt-1 text-sm text-muted-foreground">{t('register.for_context',{country,trade:draft.trade.kind ? t(`supplier_kind.${draft.trade.kind}`) : t('register.context')})}</p>
   {required.length>0 && <p className="mt-2 text-xs font-semibold text-primary" aria-live="polite">{t('register.count',{done:attached,total:required.length})}</p>}
  </div>
  <label className="relative block">
   <span className="sr-only">{t('register.search')}</span><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
   <input type="search" className={`${inputCls} pl-9`} value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('register.search')}/>
  </label>
  {q.isPending && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>{t('register.loading')}</p>}
  {q.isError && <div className="text-sm text-destructive"><p>{t('register.load_failed')}</p><Button variant="outline" onClick={()=>q.refetch()}>{t('register.retry')}</Button></div>}
  {groups.map(group=> {
   const items=visible.filter(d=>d.effectiveRequirement===group);
   if(!items.length) return null;
   return <details key={`${group}:${query}`} open={group==='required' || !!query || !required.length} className="border-b border-border pb-3">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2 font-bold text-primary focus-visible:outline focus-visible:outline-ring">
     <span className="text-sm">{t(`register.${group}`)} <span className="text-muted-foreground">({items.length})</span></span><ChevronDown className="h-4 w-4 shrink-0"/>
    </summary>
    <div className="divide-y divide-border">{items.map(d=> {
     const supplied=draft.documents.some(x=>x.docType===d.code);
     return <div key={d.id} className="flex items-start gap-3 py-3">
      <span className="mt-1 shrink-0 text-primary">{supplied ? <Check className="h-4 w-4"/> : <FileText className="h-4 w-4"/>}</span>
      <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{name(d)}</p>
       <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(d.explanation_key ?? `register.explain.${d.category}`)}</p>
       <p className="mt-1 text-xs text-muted-foreground">{d.issuer}</p>
       {supplied && <span className="text-xs font-semibold text-primary">{t('register.attached')}</span>}
      </div>
      <Button type="button" variant="outline" size="icon" onClick={()=>select(d)} aria-label={`${t('register.upload')} — ${name(d)}`} title={`${t('register.upload')} — ${name(d)}`}><Upload/></Button>
     </div>;
    })}</div>
   </details>;
  })}
  {!q.isPending && !q.isError && !visible.length && <p className="text-sm text-muted-foreground">{t('register.empty')}</p>}
  {selected && <div ref={uploadRef} className="space-y-3 border-l-4 border-primary bg-secondary p-4">
   <div className="flex items-start justify-between gap-2"><h3 className="break-words text-sm font-bold text-primary">{name(selected)}</h3>
    <Button variant="ghost" size="icon" aria-label={t('register.cancel')} onClick={()=>setSelected(null)}><X/></Button>
   </div>
   <label className="block text-sm font-semibold">{t('register.file')}
    <input ref={fileRef} type="file" className="mt-2 block w-full min-w-0 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-background file:p-2 file:text-primary" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setFile(e.target.files?.[0]??null)}/>
   </label>
   {selected.validity_rule!=='no_expiry' && <Field label={t('register.expiry')}><input type="date" min={new Date().toISOString().slice(0,10)} className={inputCls} value={expires} onChange={e=>setExpires(e.target.value)}/></Field>}
   <Button type="button" className="w-full" disabled={!file||busy} onClick={add}>{busy ? <Loader2 className="animate-spin"/> : <Upload/>}{t('register.add')}</Button>
  </div>}
  {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
  <div className="space-y-3">
   <h3 className="text-sm font-bold text-primary">{t('register.uploaded')} ({draft.documents.length})</h3>
   {draft.documents.map(d=>{
    const entry=types.find(x=>x.code===d.docType);
    return <div key={d.id} className="flex flex-wrap items-center gap-2 border-b border-border py-3">
     <FileText className="h-5 w-5 shrink-0 text-primary"/>
     <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{entry ? name(entry) : legacy.includes(d.docType) ? t(`register.legacy.${d.docType}`) : d.docType}</p><p className="break-all text-xs text-muted-foreground">{d.fileName}</p>
      <p className={`mt-1 text-xs ${isExpired(d.expiresAt)?'text-destructive':'text-muted-foreground'}`}>{checking.includes(d.id) ? t('wizard.checking_doc') : d.state==='uploaded' ? t('wizard.uploaded') : t('wizard.waiting_upload')}{d.expiresAt ? ` · ${d.expiresAt}` : ''}</p>
     </div>
     <Button variant="ghost" size="icon" disabled={d.state!=='uploaded'} onClick={()=>open(d.id,d.fileName)} aria-label={`${t('register.view')} — ${d.fileName}`} title={t('register.view')}><Eye/></Button>
     <Button variant="ghost" size="icon" className="text-destructive" aria-label={`${t('register.delete')} — ${d.fileName}`} title={t('register.delete')} onClick={async()=>{if(window.confirm(t('wizard.delete_confirm'))) setError(await removeDocument(d.id));}}><Trash2/></Button>
    </div>;
   })}
  </div>
  <DocExtractionReview supplierId={draft.supplierId}/>
  <Dialog open={!!preview} onOpenChange={open=>{if(!open)setPreview(null);}}>
   <DialogContent className="max-h-[90dvh] max-w-3xl overflow-auto"><DialogHeader><DialogTitle className="break-all">{preview?.name}</DialogTitle></DialogHeader>
    {preview?.pdf ? <iframe title={preview.name} src={preview.url} className="h-[65dvh] w-full"/> : preview && <img src={preview.url} alt={preview.name} className="h-auto w-full object-contain"/>}
   </DialogContent>
  </Dialog>
 </section>;
}