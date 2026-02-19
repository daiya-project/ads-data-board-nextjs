var $=Object.defineProperty;var R=(e,t,s)=>t in e?$(e,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):e[t]=s;var y=(e,t,s)=>R(e,typeof t!="symbol"?t+"":t,s);import{s as g,j as S,k as w,l as m,m as C}from"./index-DEwrhD7r.js";const I=[{status:"active",label:"Active Client",iconClass:"ri-user-star-fill",activeCountOnly:!0},{status:"new",label:"New Clients",iconClass:"ri-sparkling-fill"},{status:"stopped",label:"Stopped",iconClass:"ri-pause-circle-fill"},{status:"rising",label:"Revenue Up",iconClass:"ri-arrow-right-up-line"},{status:"falling",label:"Revenue Down",iconClass:"ri-arrow-right-down-line"}];function k(e){return e==="daily"?"summary":"weekly-summary"}class E{constructor(t){y(this,"root",null);this.kind=t}render(t){const s=k(this.kind),a=`
      <div class="StatusCards__grid">
        ${I.map(l=>`
          <div class="StatusCards__card StatusCards__card--${l.status}" data-status="${l.status}">
            <div class="StatusCards__icon">
              <i class="${l.iconClass}"></i>
            </div>
            <div class="StatusCards__info">
              <span class="StatusCards__label">${l.label}</span>
              <div class="StatusCards__metrics">
                ${l.activeCountOnly?`<span class="StatusCards__count" id="${s}-active-count">0 → 0</span>`:`<span class="StatusCards__count" id="${s}-${l.status}-count">0</span><span class="StatusCards__amount" id="${s}-${l.status}-amount">₩0</span>`}
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;t.insertAdjacentHTML("beforeend",a),this.root=t.lastElementChild}destroy(){var t;(t=this.root)==null||t.remove(),this.root=null}}class F{constructor(t){y(this,"root",null);this.kind=t}render(t){const s=this.kind==="daily"?"daily":"weekly",a=`
      <div class="ReportFilters__filters">
        <div class="ReportFilters__filterGroup">
          <div class="ReportFilters__searchWrapper">
            <input type="text" id="${s}-search-input" class="ReportFilters__searchInput" placeholder="Client 검색...">
            <button type="button" class="ReportFilters__searchClearBtn" id="${s}-search-clear" style="display: none;">✕</button>
          </div>
        </div>
        <div class="ReportFilters__filterGroup">
          <select id="${s}-manager-filter" class="ReportFilters__managerSelect">
            <option value="">담당자</option>
          </select>
        </div>
      </div>
    `;t.insertAdjacentHTML("beforeend",a),this.root=t.lastElementChild}destroy(){var t;(t=this.root)==null||t.remove(),this.root=null}}class T{constructor(t){y(this,"root",null);this.kind=t}render(t){const s=this.kind==="daily"?"daily":"weekly",a=`${s}-report-table`,l=`${s}-report-thead`,_=`${s}-report-tbody`,i=`
      <div class="ReportTable__container">
        <table class="ReportTable__table" id="${a}">
          <thead id="${l}">
            <tr>
              <th>Client ID</th>
              <th>Client</th>
            </tr>
          </thead>
          <tbody id="${_}">
            <tr>
              <td colspan="2" class="ReportTable__emptyState">데이터 로딩 중...</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;t.insertAdjacentHTML("beforeend",i),this.root=t.lastElementChild}destroy(){var t;(t=this.root)==null||t.remove(),this.root=null}}let r=null,n=null,o=null,d=null,c=null,u=null;function f(e,t,s){const a=t==="daily"?"tab-content active":"tab-content",l=t==="daily"?"daily-tab":"weekly-tab",_=t==="daily"?"daily-status-filter":"weekly-status-filter",i=document.createElement("div");i.className=a,i.id=l,i.innerHTML=`<input type="hidden" id="${_}" value="">`,e.appendChild(i);const h=new E(t);h.render(i),t==="daily"?r=h:d=h;const p=document.createElement("div");p.className="report-section",i.appendChild(p);const v=new F(t);v.render(p),t==="daily"?n=v:c=v;const b=new T(t);b.render(p),t==="daily"?o=b:u=b}function L(e){e.children.length>0||(f(e,"daily"),f(e,"weekly"))}function D(){const e=document.getElementById("sales-report-page");if(!e)return;e.children.length===0&&(L(e),g(),S(),w(C,m));const t=document.querySelector('.Sidebar__navItem[data-page="sales-report"] .Sidebar__subItem.active'),s=t==null?void 0:t.getAttribute("data-sub-page"),a=document.getElementById("daily-tab"),l=document.getElementById("weekly-tab");s==="weekly"?(l&&l.classList.add("active"),a&&a.classList.remove("active"),m()):(a&&a.classList.add("active"),l&&l.classList.remove("active"),C())}function j(){r==null||r.destroy(),r=null,n==null||n.destroy(),n=null,o==null||o.destroy(),o=null,d==null||d.destroy(),d=null,c==null||c.destroy(),c=null,u==null||u.destroy(),u=null}export{j as destroy,L as init,D as initReportsPage,C as loadDailyReport,m as loadWeeklyReport,g as setupDailyReportFilters,S as setupWeeklyReportFilters};
