import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Archive, RotateCcw, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { useDocumentRegister } from '@/lib/document-register-query';
import { supabase } from '@/integrations/supabase/client';
import { extractionDefinition } from '@/lib/ai/schemas';
import { SUPPLIER_KINDS, useTaxonomy } from '@/lib/taxonomy';
import type { DocumentType } from '@/lib/document-register';
import { inputCls, Field } from '@/components/onboarding/fields';

export const Route = createFileRoute('/_authenticated/admin/document-register')({
 head:()=>({meta:[{title:'Document register — UTS'},{name:'description',content:'Manage country and trade document requirements for the UTS supplier network.'},{property:'og:title',content:'Document register — UTS'},{property:'og:description',content:'Manage official supplier document types and trade requirements.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:DocumentRegister,
});
const categories=['identity','business_licence','tax','trade_qualification','industry_registration','social_security','vehicle','transport_permit','work_permit','environmental','customs','insurance','safety','asset_register'];
const blank = (): Partial<DocumentType> => ({code:'',local_name:'',issuer:'',country_code:null,category:'business_licence',applies_to:['ALL'],requirement:'optional',validity_rule:'printed_dates',verification_status:'unverified',retired:false,notes:'',online_check_url:'',validity_months:null,fixed_expiry_month_day:null});

function DocumentRegister() {
 const t=useT(); const {roles}=useAuth(); const q=useDocumentRegister(); const tax=useTaxonomy(); const qc=useQueryClient();
 const canEdit=roles.some(r=>r==='admin'||r==='ops');
 const [search,setSearch]=useState(''); const [country,setCountry]=useState(''); const [retired,setRetired]=useState(false);
 const [edit,setEdit]=useState<Partial<DocumentType>|null>(null); const [fields,setFields]=useState('reference_number\nissuing_body\nholder_name\nissue_date\nexpiry_date');
 const [overrides,setOverrides]=useState<Record<string,string>>({}); const [busy,setBusy]=useState(false); const [error,setError]=useState(false);
 const refresh=()=>qc.invalidateQueries({queryKey:['document-register']});
 function open(d?:DocumentType) {
  setEdit(d??blank()); setError(false);
  setFields(d ? (extractionDefinition(d.code,d.extraction_schema)?.fields ?? []).map(f=>`${f.key}${f.list?'[]':''}`).join('\n') : 'reference_number\nissuing_body\nholder_name\nissue_date\nexpiry_date');
  setOverrides(Object.fromEntries((q.data?.overrides??[]).filter(o=>o.document_type_id===d?.id).map(o=>[o.supplier_kind,o.requirement])));
 }
 async function save() {
  if(!edit) return;
  setBusy(true);setError(false);
  try {
   const schema={schema:'registered_document',fields:fields.split('\n').map(s=>s.trim()).filter(Boolean).map(s=>({key:s.replace(/\[\]$/,''),list:s.endsWith('[]')}))};
   const valid=extractionDefinition('new',schema);
   if(!valid || valid.fields.length!==schema.fields.length || !/^[A-Za-z][A-Za-z0-9_]{1,79}$/.test(edit.code??'')) throw new Error();
   const payload={...edit,code:(edit.code??'').trim(),local_name:(edit.local_name??'').trim(),issuer:(edit.issuer??'').trim(),country_code:edit.country_code||null,online_check_url:edit.online_check_url||null,explanation_key:edit.explanation_key||`register.explain.${edit.category}`,extraction_schema:schema};
   if(!payload.local_name||!payload.issuer) throw new Error();
   if(payload.online_check_url && !/^https:\/\//.test(payload.online_check_url)) throw new Error();
   const result=edit.id ? await supabase.from('document_types').update(payload).eq('id',edit.id).select('id').single() : await supabase.from('document_types').insert(payload as DocumentType).select('id').single();
   if(result.error||!result.data) throw new Error();
   for(const kind of SUPPLIER_KINDS) {
    const requirement=overrides[kind];
    const r=requirement ? await supabase.from('trade_document_requirements').upsert({document_type_id:result.data.id,supplier_kind:kind,requirement},{onConflict:'supplier_kind,document_type_id'}) : await supabase.from('trade_document_requirements').delete().eq('document_type_id',result.data.id).eq('supplier_kind',kind);
    if(r.error) throw new Error();
   }
   await refresh();setEdit(null);
  } catch {setError(true);} finally {setBusy(false);}
 }
 const patch=(key:keyof DocumentType,value:unknown)=>setEdit(e=>e?{...e,[key]:value}:e);
 if(!canEdit) return <p className="text-sm text-muted-foreground">{t('common.access_denied')}</p>;
 return <div className="mx-auto max-w-5xl space-y-5">
  <div className="flex items-center justify-between gap-2"><h1 className="text-2xl font-bold text-primary">{t('register.title')}</h1><Button onClick={()=>open()}><Plus/>{t('register.new')}</Button></div>
  <div className="flex flex-wrap gap-3"><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><input className={`${inputCls} pl-9`} aria-label={t('register.search')} placeholder={t('register.search')} value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <select className={inputCls+' max-w-52'} aria-label={t('register.country')} value={country} onChange={e=>setCountry(e.target.value)}><option value="">{t('register.all_countries')}</option>{tax.data?.countries.map(c=><option key={c.iso2} value={c.iso2}>{c.name}</option>)}</select>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={retired} onChange={e=>setRetired(e.target.checked)}/>{t('register.retired')}</label>
  </div>
  {q.isPending && <Loader2 className="animate-spin text-primary"/>}
  {(q.isError||error) && <p role="alert" className="text-sm text-destructive">{t('register.save_failed')}</p>}
  <div className="divide-y divide-border">{q.data?.types.filter(d=>d.retired===retired&&(!country||d.country_code===country)&&`${d.local_name} ${d.code} ${d.issuer}`.toLowerCase().includes(search.toLowerCase())).map(d=><div key={d.id} className="flex items-start gap-3 py-4">
   <div className="min-w-0 flex-1"><h2 className="break-words text-sm font-bold">{d.local_name}</h2><p className="mt-1 text-xs text-muted-foreground">{d.country_code??t('register.all_countries')} · {d.issuer}</p><p className="mt-1 text-xs text-muted-foreground">{t(`register.${d.requirement}`)} · {t(`register.${d.verification_status}`)}</p></div>
   <Button variant="outline" size="icon" aria-label={`${t('register.edit')} — ${d.local_name}`} title={t('register.edit')} onClick={()=>open(d)}><Pencil/></Button>
   <Button variant="ghost" size="icon" title={t(d.retired?'register.restore':'register.retire')} aria-label={`${t(d.retired?'register.restore':'register.retire')} — ${d.local_name}`} onClick={async()=>{const r=await supabase.from('document_types').update({retired:!d.retired}).eq('id',d.id);setError(!!r.error);if(!r.error)refresh();}}>{d.retired?<RotateCcw/>:<Archive/>}</Button>
  </div>)}</div>
  <Dialog open={!!edit} onOpenChange={v=>{if(!v&&!busy)setEdit(null);}}><DialogContent className="max-h-[90dvh] max-w-3xl overflow-auto"><DialogHeader><DialogTitle>{t(edit?.id?'register.edit':'register.new')}</DialogTitle></DialogHeader>
   {edit && <form onSubmit={e=>{e.preventDefault();save();}} className="space-y-4">
    <Field label="Code"><input required disabled={!!edit.id} className={inputCls} value={edit.code??''} onChange={e=>patch('code',e.target.value)}/></Field>
    <Field label={t('register.name')}><input required className={inputCls} value={edit.local_name??''} onChange={e=>patch('local_name',e.target.value)}/></Field>
    <Field label={t('register.issuer')}><input required className={inputCls} value={edit.issuer??''} onChange={e=>patch('issuer',e.target.value)}/></Field>
    <div className="grid gap-3 sm:grid-cols-2"><Field label={t('register.country')}><select className={inputCls} value={edit.country_code??''} onChange={e=>patch('country_code',e.target.value||null)}><option value="">{t('register.all_countries')}</option>{tax.data?.countries.map(c=><option key={c.iso2} value={c.iso2}>{c.name}</option>)}</select></Field>
    <Field label={t('register.category')}><select className={inputCls} value={edit.category} onChange={e=>patch('category',e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></Field></div>
    <Field label={t('register.tags')}><input className={inputCls} value={edit.applies_to?.join(', ')??''} onChange={e=>patch('applies_to',e.target.value.split(',').map(v=>v.trim().toUpperCase()))}/></Field>
    <div className="grid gap-3 sm:grid-cols-2"><Field label={t('register.requirement')}><select className={inputCls} value={edit.requirement} onChange={e=>patch('requirement',e.target.value)}>{['required','conditional','optional'].map(r=><option key={r} value={r}>{t(`register.${r}`)}</option>)}</select></Field>
    <Field label={t('register.verification')}><select className={inputCls} value={edit.verification_status} onChange={e=>patch('verification_status',e.target.value)}>{['verified','unverified'].map(v=><option key={v} value={v}>{t(`register.${v}`)}</option>)}</select></Field></div>
    <Field label={t('register.validity')}><select className={inputCls} value={edit.validity_rule} onChange={e=>patch('validity_rule',e.target.value)}>{['printed_dates','no_expiry','fixed_months','fixed_annual_date'].map(v=><option key={v} value={v}>{t(`register.${v}`)}</option>)}</select></Field>
    {edit.validity_rule==='fixed_months'&&<Field label={t('register.months')}><input required type="number" min="1" max="120" className={inputCls} value={edit.validity_months??''} onChange={e=>patch('validity_months',Number(e.target.value))}/></Field>}
    {edit.validity_rule==='fixed_annual_date'&&<Field label={t('register.annual')}><input required pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])" className={inputCls} value={edit.fixed_expiry_month_day??''} onChange={e=>patch('fixed_expiry_month_day',e.target.value)}/></Field>}
    <Field label={t('register.url')}><input type="url" className={inputCls} value={edit.online_check_url??''} onChange={e=>patch('online_check_url',e.target.value)}/></Field>
    <Field label={t('register.notes')}><textarea className={inputCls} value={edit.notes??''} onChange={e=>patch('notes',e.target.value)}/></Field>
    <Field label={t('register.fields')}><textarea required className={`${inputCls} min-h-32 font-mono`} value={fields} onChange={e=>setFields(e.target.value)}/></Field>
    <details><summary className="cursor-pointer text-sm font-semibold text-primary">{t('register.trades')}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{SUPPLIER_KINDS.map(k=><Field key={k} label={t(`supplier_kind.${k}`)}><select className={inputCls} value={overrides[k]??''} onChange={e=>setOverrides(o=>({...o,[k]:e.target.value}))}><option value="">—</option>{['required','conditional','optional'].map(r=><option key={r} value={r}>{t(`register.${r}`)}</option>)}</select></Field>)}</div></details>
    {error&&<p role="alert" className="text-sm text-destructive">{t('register.save_failed')}</p>}
    <div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={()=>setEdit(null)}>{t('register.cancel')}</Button><Button type="submit" disabled={busy}>{busy&&<Loader2 className="animate-spin"/>}{t('register.save')}</Button></div>
   </form>}
  </DialogContent></Dialog>
 </div>;
}