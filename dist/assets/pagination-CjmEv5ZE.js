import{c as m,j as e,e as x}from"./index-CCcUsLUL.js";import{B as h}from"./button-CNca5wqe.js";/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=m("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=m("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.453.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=m("Ellipsis",[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"19",cy:"12",r:"1",key:"1wjl8i"}],["circle",{cx:"5",cy:"12",r:"1",key:"1pcz8c"}]]),z=({currentPage:l,totalPages:s,onPageChange:t,className:f,showPageNumbers:v=!0,maxPageButtons:r=5})=>{const d=l>1,p=l<s,u=()=>{d&&t(l-1)},N=()=>{p&&t(l+1)},b=(()=>{if(s<=r)return Array.from({length:s},(c,j)=>j+1);const i=[],n=Math.floor(r/2);i.push(1);let a=Math.max(2,l-n),o=Math.min(s-1,l+n);l<=n+1?o=Math.min(s-1,r-1):l>=s-n&&(a=Math.max(2,s-r+2)),a>2&&i.push("ellipsis");for(let c=a;c<=o;c++)i.push(c);return o<s-1&&i.push("ellipsis"),s>1&&i.push(s),i})();return e.jsxs("div",{className:x("flex items-center justify-between gap-2 flex-wrap",f),role:"navigation","aria-label":"Pagination navigation",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs(h,{variant:"outline",size:"sm",onClick:u,disabled:!d,"aria-label":"Go to previous page",className:"gap-1",children:[e.jsx(y,{className:"h-4 w-4"}),"Previous"]}),v&&e.jsx("div",{className:"hidden sm:flex items-center gap-1",children:b.map((i,n)=>{if(i==="ellipsis")return e.jsx("div",{className:"px-2 py-1 text-gray-500","aria-hidden":"true",children:e.jsx(k,{className:"h-4 w-4"})},`ellipsis-${n}`);const a=i===l;return e.jsx(h,{variant:a?"default":"outline",size:"sm",onClick:()=>t(i),disabled:a,"aria-label":`Go to page ${i}`,"aria-current":a?"page":void 0,className:x("min-w-[2rem]",a&&"bg-blue-600 text-white hover:bg-blue-700"),children:i},i)})}),e.jsxs(h,{variant:"outline",size:"sm",onClick:N,disabled:!p,"aria-label":"Go to next page",className:"gap-1",children:["Next",e.jsx(w,{className:"h-4 w-4"})]})]}),e.jsxs("div",{className:"text-sm text-gray-600","aria-live":"polite",children:["Page ",l," of ",s]})]})};export{y as C,z as P,w as a};
