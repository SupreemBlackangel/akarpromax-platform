import crypto from "node:crypto";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const BASE = process.env.ORGANIZATIONS_F3_BASE || "http://127.0.0.1:3016";
const sql = postgres(process.env.DATABASE_URL, { max: 5, prepare: false });
const stamp = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const password = `Akar!${crypto.randomBytes(9).toString("hex")}`;
const userIds=[], orgIds=[], branchIds=[], checks=[];

function ok(v,n,d=""){ if(!v) throw new Error(`${n}${d?` :: ${d}`:""}`); checks.push(n); console.log(`PASS  ${n}`); }
async function api(path,o={}){
  const h={Accept:"application/json",Origin:BASE,...(o.headers||{})};
  if(o.body!==undefined) h["Content-Type"]="application/json";
  if(o.cookie) h.Cookie=o.cookie;
  const r=await fetch(BASE+path,{method:o.method||"GET",headers:h,body:o.body===undefined?undefined:JSON.stringify(o.body),redirect:"manual"});
  const t=await r.text(); let j=null; try{j=t?JSON.parse(t):null}catch{}
  return {status:r.status,text:t,json:j,response:r};
}
function getCookie(r){ const a=typeof r.headers.getSetCookie==="function"?r.headers.getSetCookie():[r.headers.get("set-cookie")].filter(Boolean); const h=a.find(x=>x.startsWith("akar_session=")); return h?h.split(";",1)[0]:null; }
async function createUser(label,role="user"){
  const email=`f3.${label}.${stamp}@example.invalid`; const hash=await bcrypt.hash(password,12);
  const [u]=await sql`insert into users (email,email_verified_at,name,password_hash,role,status,is_active,preferred_language,created_at) values (${email},now(),${`F3 ${label}`},${hash},${role},'active',true,'ar',now()) returning id,email`;
  userIds.push(u.id); return u;
}
async function login(u){ const r=await api("/api/auth/login",{method:"POST",body:{email:u.email,password}}); ok(r.status===200,`LOGIN ${u.email}`,r.text); const c=getCookie(r.response); ok(Boolean(c),`COOKIE ${u.email}`); return c; }
async function createOrg(c,type,label){
  const r=await api("/api/amrs/organizations",{method:"POST",cookie:c,body:{nameAr:`F3 ${label} ${stamp}`,type,classification:"startup",countryCode:"SA"}});
  ok(r.status===201,`CREATE ${label}`,r.text); const o=r.json?.organization; ok(Boolean(o?.id),`UUID ${label}`); orgIds.push(o.id); return o;
}
async function approve(ownerCookie,adminCookie,id){
  let r=await api(`/api/amrs/organizations/${id}/submit`,{method:"POST",cookie:ownerCookie}); ok(r.status===200,`SUBMIT ${id}`,r.text);
  r=await api(`/api/admin/organizations/${id}/review`,{method:"PATCH",cookie:adminCookie,body:{action:"approve"}}); ok(r.status===200,`APPROVE ${id}`,r.text);
}
async function cleanup(){
  try{
    if(branchIds.length) await sql`delete from organization_branches where id = any(${branchIds}::uuid[])`;
    if(orgIds.length){
      await sql`delete from audit_events where detail->>'organizationId' = any(${orgIds})`;
      await sql`delete from verification_records where entity_type='organization' and entity_id = any(${orgIds}::uuid[])`;
      await sql`delete from organizations where id = any(${orgIds}::uuid[])`;
    }
    if(userIds.length){
      await sql`delete from session_revocations where user_id = any(${userIds}::uuid[])`;
      await sql`delete from audit_events where user_id = any(${userIds}::uuid[])`;
      await sql`delete from users where id = any(${userIds}::uuid[])`;
    }
    console.log("CLEANUP: DONE");
  }catch(e){ console.error("CLEANUP: FAIL",e); }
}
try{
  const owner=await createUser("owner"), manager=await createUser("manager"), outsider=await createUser("outsider"), admin=await createUser("admin","super_admin");
  const co=await login(owner), cm=await login(manager), cx=await login(outsider), ca=await login(admin);
  const office=await createOrg(co,"real_estate","office"), company=await createOrg(co,"business","company");
  await approve(co,ca,office.id); await approve(co,ca,company.id);

  let r=await api(`/api/amrs/organizations/${office.id}/members`,{method:"POST",cookie:co,body:{userId:manager.id,role:"manager"}}); ok(r.status===201,"ADD OFFICE MANAGER",r.text);
  r=await api(`/api/amrs/organizations/${company.id}/members`,{method:"POST",cookie:co,body:{userId:manager.id,role:"manager"}}); ok(r.status===201,"ADD COMPANY MANAGER",r.text);

  r=await api("/api/amrs/organizations?mine=1&type=real_estate",{cookie:co}); ok(r.status===200&&r.json.organizations.some(x=>x.id===office.id)&&!r.json.organizations.some(x=>x.id===company.id),"MINE OFFICE SCOPED");
  r=await api("/api/amrs/organizations?mine=1&type=business",{cookie:co}); ok(r.status===200&&r.json.organizations.some(x=>x.id===company.id)&&!r.json.organizations.some(x=>x.id===office.id),"MINE COMPANY SCOPED");

  r=await api(`/api/office/profile?org=${office.id}`,{cookie:cm}); ok(r.status===200&&r.json.data.id===office.id,"MANAGER READ OFFICE PROFILE",r.text);
  r=await api(`/api/office/profile?org=${company.id}`,{cookie:co}); ok(r.status===404,"COMPANY BLOCKED AS OFFICE");
  r=await api(`/api/company/profile?org=${company.id}`,{cookie:cm}); ok(r.status===200&&r.json.data.id===company.id,"MANAGER READ COMPANY PROFILE");
  r=await api(`/api/company/profile?org=${office.id}`,{cookie:co}); ok(r.status===404,"OFFICE BLOCKED AS COMPANY");

  r=await api(`/api/office/profile?org=${office.id}`,{method:"PATCH",cookie:cm,body:{organizationId:office.id,nameAr:"blocked"}}); ok(r.status===403,"MANAGER OFFICE PATCH BLOCKED");
  r=await api(`/api/office/profile?org=${office.id}`,{method:"PATCH",cookie:co,body:{organizationId:office.id,descriptionAr:"F3 office profile"}}); ok(r.status===200,"OWNER OFFICE PATCH");
  r=await api(`/api/company/profile?org=${company.id}`,{method:"PATCH",cookie:cm,body:{organizationId:company.id,nameAr:"blocked"}}); ok(r.status===403,"MANAGER COMPANY PATCH BLOCKED");
  r=await api(`/api/company/profile?org=${company.id}`,{method:"PATCH",cookie:co,body:{organizationId:company.id,descriptionAr:"F3 company profile"}}); ok(r.status===200,"OWNER COMPANY PATCH");

  r=await api(`/api/office/branches?org=${office.id}`,{cookie:cm}); ok(r.status===200,"MANAGER READ OFFICE BRANCHES");
  r=await api(`/api/office/branches?org=${office.id}`,{method:"POST",cookie:cm,body:{organizationId:office.id,nameAr:"blocked"}}); ok(r.status===403,"MANAGER CREATE BRANCH BLOCKED");
  r=await api(`/api/office/branches?org=${office.id}`,{method:"POST",cookie:co,body:{organizationId:office.id,nameAr:"فرع F3",countryCode:"SA",cityId:"Jeddah"}}); ok(r.status===201,"OWNER CREATES OFFICE BRANCH",r.text); branchIds.push(r.json.data.id);
  const branchId=r.json.data.id;
  r=await api(`/api/company/branches?org=${company.id}`,{method:"PATCH",cookie:co,body:{organizationId:company.id,id:branchId,nameAr:"cross"}}); ok(r.status===404,"CROSS-ORG BRANCH UPDATE BLOCKED");

  const pages=[
    ["/dashboard/offices","MY OFFICES PAGE"],
    ["/dashboard/companies","MY COMPANIES PAGE"],
    [`/dashboard/office/members?org=${office.id}`,"OFFICE MEMBERS PAGE"],
    [`/dashboard/office/properties?org=${office.id}`,"OFFICE PROPERTIES PAGE"],
    [`/dashboard/office/property-requests?org=${office.id}`,"OFFICE REQUESTS PAGE"],
    [`/dashboard/office/profile?org=${office.id}`,"OFFICE PROFILE PAGE"],
    [`/dashboard/office/branches?org=${office.id}`,"OFFICE BRANCHES PAGE"],
    [`/dashboard/company?org=${company.id}`,"COMPANY ROOT PAGE"],
    [`/dashboard/company/members?org=${company.id}`,"COMPANY MEMBERS PAGE"],
    [`/dashboard/company/services?org=${company.id}`,"COMPANY SERVICES PAGE"],
    [`/dashboard/company/profile?org=${company.id}`,"COMPANY PROFILE PAGE"],
    [`/dashboard/company/branches?org=${company.id}`,"COMPANY BRANCHES PAGE"],
  ];
  for(const [path,label] of pages){
    const p=await api(path,{cookie:co}); ok(p.status===200,label,`${p.status} ${p.text.slice(0,160)}`); ok(!/وضع الضيف|بيانات تجريبية/.test(p.text),`${label} NO DEMO MODE`);
  }

  r=await api(`/api/offices/${office.id}`); ok(r.status===200,"PUBLIC OFFICE DETAIL API");
  r=await api(`/api/offices/${company.id}`); ok(r.status===404,"COMPANY BLOCKED FROM OFFICE API");
  r=await api(`/api/companies/${company.id}`); ok(r.status===200,"PUBLIC COMPANY DETAIL API");
  r=await api(`/api/companies/${office.id}`); ok(r.status===404,"OFFICE BLOCKED FROM COMPANY API");
  r=await api(`/api/office/profile?org=${office.id}`,{cookie:cx}); ok(r.status===404,"OUTSIDER OFFICE BLOCKED");
  r=await api(`/api/company/profile?org=${company.id}`,{cookie:cx}); ok(r.status===404,"OUTSIDER COMPANY BLOCKED");

  console.log("");
  console.log("======================================");
  console.log("ORGANIZATIONS F3 WORKSPACE/PUBLIC E2E: PASS");
  console.log(`CHECKS: ${checks.length}/${checks.length}`);
  console.log("MULTI-ORG MEMBERSHIP SCOPING: PASS");
  console.log("WORKSPACE AUTHORIZATION: PASS");
  console.log("PROFILE + BRANCH SECURITY: PASS");
  console.log("PUBLIC TYPE SEPARATION: PASS");
  console.log("SAFE FOR ORGANIZATIONS FINAL VISUAL CHECK: YES");
  console.log("======================================");
}catch(e){
  console.error("ORGANIZATIONS F3 WORKSPACE/PUBLIC E2E: FAIL");
  console.error(e?.stack||e);
  process.exitCode=1;
}finally{ await cleanup(); await sql.end({timeout:5}); }
