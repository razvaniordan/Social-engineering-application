"use strict";(self.webpackChunkraiffeisen_pi=self.webpackChunkraiffeisen_pi||[]).push([[6712],{66712:(h,g,r)=>{r.r(g),r.d(g,{NewCreditModule:()=>L});var d=r(36895),m=r(66159),_=r(89383),s=r(188),u=r(54004),C=r(35684),p=r(83009),n=r(94650),f=r(14146);const w=function(e){return{"new-credit-carousel-item--shadow":e}};function M(e,i){if(1&e&&(n.ynx(0),n.TgZ(1,"div",15),n._UZ(2,"img",16),n.qZA(),n.BQk()),2&e){const t=i.$implicit,o=i.index,c=n.oxw(3);n.xp6(1),n.Q6J("ngClass",n.VKq(2,w,o===c.current)),n.xp6(1),n.Q6J("src",t.imageUrl,n.LSH)}}function O(e,i){if(1&e){const t=n.EpF();n.TgZ(0,"ui-rzbr-carousel",14),n.NdJ("currentChange",function(c){n.CHM(t);const a=n.oxw(2);return n.KtG(a.currentChange(c))}),n.YNc(1,M,3,4,"ng-container",7),n.qZA()}if(2&e){const t=n.oxw().ngIf,o=n.oxw();n.Q6J("current",o.current)("visibleItems",1)("showHiddenItems",!0),n.xp6(1),n.Q6J("ngForOf",t)("ngForTrackBy",o.trackByFn)}}const P=function(e){return{"dots-item--active":e}};function b(e,i){if(1&e){const t=n.EpF();n.ynx(0),n.TgZ(1,"span",17),n.NdJ("click",function(){const a=n.CHM(t).index,l=n.oxw().ngIf,k=n.oxw();return n.KtG(k.change(a,l))}),n.qZA(),n.BQk()}if(2&e){const t=i.index,o=n.oxw(2);n.xp6(1),n.Q6J("ngClass",n.VKq(1,P,o.current===t))}}function x(e,i){if(1&e&&n._UZ(0,"div",18),2&e){const o=i.index;n.Q6J("innerHTML",i.$implicit,n.oJD),n.uIk("aria-label","new_product_new_card_selection_leadDescArr"+o)}}function v(e,i){if(1&e){const t=n.EpF();n.ynx(0),n._UZ(1,"h1",1),n.ALo(2,"translate"),n._UZ(3,"div",2),n.TgZ(4,"div",3)(5,"div",4),n.YNc(6,O,2,5,"ui-rzbr-carousel",5),n.qZA(),n.TgZ(7,"div",6),n.YNc(8,b,2,3,"ng-container",7),n.qZA()(),n.TgZ(9,"div",8),n.YNc(10,x,1,2,"div",9),n.qZA(),n.TgZ(11,"div",10)(12,"button",11),n.NdJ("click",function(){const a=n.CHM(t).ngIf,l=n.oxw();return n.KtG(l.navigate(a[l.current].leadLink))}),n._UZ(13,"span",12),n.ALo(14,"translate"),n._UZ(15,"ui-rzbr-icon",13),n.qZA()(),n.BQk()}if(2&e){const t=i.ngIf,o=n.oxw();n.xp6(1),n.Q6J("innerHTML",n.lcZ(2,9,"new_products__labels_new_credit_title"),n.oJD),n.xp6(2),n.Q6J("innerHTML",t[o.current].description,n.oJD),n.xp6(3),n.Q6J("ngIf",t.length),n.xp6(2),n.Q6J("ngForOf",t)("ngForTrackBy",o.trackByFn),n.xp6(2),n.Q6J("ngForOf",t[o.current].leadDescArr),n.xp6(2),n.Q6J("type","primary"),n.xp6(1),n.Q6J("innerHtml",n.lcZ(14,11,"new_product__labels_category_action_cards"),n.oJD),n.xp6(2),n.Q6J("name",o.iconName.ARROW_RIGHT_BOLD)}}const T=[{component:(()=>{class e extends p.O{constructor(t,o){super(),this.newProductFacade=t,this.dynamicLocaleService=o,this.iconName=s.uHH,this.cardsLeadList$=this.newProductFacade.cardsLeadList$.pipe((0,u.U)(c=>c?c.map(a=>({...a,leadDescArr:a.leadDesc.split("|")})):null)),this.current=0}ngOnInit(){this.registerSubscriptions(this.dynamicLocaleService.locale$.pipe((0,C.T)(1)).subscribe(t=>{this.newProductFacade.refreshCardsLeadListLanguage()}),this.cardsLeadList$.subscribe(t=>{t||this.newProductFacade.getCardsLeadList()}))}currentChange(t){this.current=t}change(t,o){t>=o.length||-1===t||(this.current=t)}trackByFn(t){return t}navigate(t){window.open(t,"_blank")}static#n=this.\u0275fac=function(o){return new(o||e)(n.Y36(f.G),n.Y36(s.Qmw))};static#t=this.\u0275cmp=n.Xpm({type:e,selectors:[["ui-rzbr-new-credit"]],features:[n.qOj],decls:2,vars:3,consts:[[4,"ngIf"],["aria-label","new_products__labels_new_credit_title",1,"page-title--black","align-center","new-credit-page-title",3,"innerHTML"],["aria-label","new_product_new_card_selection_description",1,"page-title--black","align-center","new-credit-title",3,"innerHTML"],[1,"new-credit-container"],[1,"new-credit-carousel"],[3,"current","visibleItems","showHiddenItems","currentChange",4,"ngIf"],[1,"dots"],[4,"ngFor","ngForOf","ngForTrackBy"],["aria-label","new_product_new_card_selection_leadDescArr",1,"description"],["class","description-item",3,"innerHTML",4,"ngFor","ngForOf"],[1,"new-credit-actions"],["uiRzbrButton","","aria-label","new_product_new_card_selection_action",3,"type","click"],[3,"innerHtml"],[3,"name"],[3,"current","visibleItems","showHiddenItems","currentChange"],[1,"new-credit-carousel-item","carousel-item",3,"ngClass"],["alt","",1,"new-credit-carousel-item-image",3,"src"],[1,"dots-item",3,"ngClass","click"],[1,"description-item",3,"innerHTML"]],template:function(o,c){1&o&&(n.YNc(0,v,16,13,"ng-container",0),n.ALo(1,"async")),2&o&&n.Q6J("ngIf",n.lcZ(1,1,c.cardsLeadList$))},dependencies:[d.mk,d.sg,d.O5,s.NjR,s._kN,s.mph,d.Ov,_.X$],styles:['h1[_ngcontent-%COMP%], .h1[_ngcontent-%COMP%]{font-size:5rem}h2[_ngcontent-%COMP%], .h2[_ngcontent-%COMP%]{font-size:3.2rem}h3[_ngcontent-%COMP%], .h3[_ngcontent-%COMP%]{font-size:2.8rem}h4[_ngcontent-%COMP%], .h4[_ngcontent-%COMP%]{font-size:2.4rem}h5[_ngcontent-%COMP%], .h5[_ngcontent-%COMP%]{font-size:2rem}h6[_ngcontent-%COMP%], .h6[_ngcontent-%COMP%]{font-size:1.6rem}[class^=icon-][_ngcontent-%COMP%]:before, [class*=" icon-"][_ngcontent-%COMP%]:before{font-family:icomoon!important;speak:none;font-style:normal;font-weight:400;font-variant:normal;text-transform:none;line-height:1;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}[_nghost-%COMP%]   .align-center[_ngcontent-%COMP%]{text-align:center}[_nghost-%COMP%]   .new-credit-page-title[_ngcontent-%COMP%]{margin-bottom:3.2rem}[_nghost-%COMP%]   .new-credit-title[_ngcontent-%COMP%]{font-size:2.4rem}[_nghost-%COMP%]   .new-credit-container[_ngcontent-%COMP%]{position:relative;overflow:hidden}[_nghost-%COMP%]   .new-credit-container[_ngcontent-%COMP%]:before, [_nghost-%COMP%]   .new-credit-container[_ngcontent-%COMP%]:after{display:block;content:"";position:absolute;top:0;bottom:0;width:10rem;z-index:500}[_nghost-%COMP%]   .new-credit-container[_ngcontent-%COMP%]:before{left:0;background:linear-gradient(to right,#f8f8f8 0%,rgba(255,255,255,0) 100%)}[_nghost-%COMP%]   .new-credit-container[_ngcontent-%COMP%]:after{right:0;background:linear-gradient(to right,rgba(255,255,255,0) 0%,#f8f8f8 100%)}@media (max-width: 479.98px){[_nghost-%COMP%]   .new-credit-container[_ngcontent-%COMP%]:before, [_nghost-%COMP%]   .new-credit-container[_ngcontent-%COMP%]:after{display:none}}[_nghost-%COMP%]   .new-credit-carousel[_ngcontent-%COMP%]{width:48rem;margin:0 auto}@media (max-width: 479.98px){[_nghost-%COMP%]   .new-credit-carousel[_ngcontent-%COMP%]{width:100%}}[_nghost-%COMP%]   .new-credit-carousel-item[_ngcontent-%COMP%]{padding:0 4rem;position:relative;z-index:0}[_nghost-%COMP%]   .new-credit-carousel-item--shadow[_ngcontent-%COMP%]:before{position:absolute;display:block;content:"";left:25%;right:25%;height:0;border-radius:80%;bottom:10px;z-index:-1;box-shadow:0 0 25px 25px #00000080}[_nghost-%COMP%]   .dots[_ngcontent-%COMP%]{text-align:center;width:100%;margin-bottom:3.2rem}[_nghost-%COMP%]   .dots-item[_ngcontent-%COMP%]{cursor:pointer;height:.8rem;width:.8rem;margin:0 1rem;background-color:#d5d5d6;border-radius:50%;display:inline-block;transition:background-color .3s ease}[_nghost-%COMP%]   .dots-item--active[_ngcontent-%COMP%], [_nghost-%COMP%]   .dots-item[_ngcontent-%COMP%]:hover{background-color:#55575c}[_nghost-%COMP%]   .description[_ngcontent-%COMP%]{margin:0 auto;width:40rem;padding:0 4rem}@media (max-width: 479.98px){[_nghost-%COMP%]   .description[_ngcontent-%COMP%]{width:100%}}[_nghost-%COMP%]   .description-item[_ngcontent-%COMP%]{text-align:left;border-bottom:.1rem solid #55575c;padding-bottom:1.6rem;padding-top:1.6rem}[_nghost-%COMP%]   .description-item[_ngcontent-%COMP%]:last-child{border-bottom:none}[_nghost-%COMP%]   .new-credit-actions[_ngcontent-%COMP%]{margin:0 auto;width:40rem;padding:4rem;height:5.6rem}'],changeDetection:0})}return e})(),path:""}];let L=(()=>{class e{static#n=this.\u0275fac=function(o){return new(o||e)};static#t=this.\u0275mod=n.oAB({type:e});static#e=this.\u0275inj=n.cJS({imports:[d.ez,_.aw,m.Bz.forChild(T),s.eVA,s.Dgd,s.uEx]})}return e})()},35684:(h,g,r)=>{r.d(g,{T:()=>m});var d=r(39300);function m(_){return(0,d.h)((s,u)=>_<=u)}}}]);