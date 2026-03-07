"use strict";

/* ================================
   WAIT FOR FULL PAGE LOAD
================================ */
window.addEventListener("load", () => {

if(typeof gsap === "undefined"){
console.warn("GSAP not loaded");
return;
}

gsap.registerPlugin(ScrollTrigger);

/* ================================
   SAFE SELECTORS
================================ */
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);

/* ================================
   NAVBAR SCROLL EFFECT
================================ */
const navbar = $("#navbar");
const backTop = $("#backTop");

window.addEventListener("scroll", () => {

const y = window.scrollY;

navbar?.classList.toggle("scrolled", y>60);
backTop?.classList.toggle("visible", y>400);

},{passive:true});

/* ================================
   MOBILE MENU
================================ */
const hamburger=$("#hamburger");
const mobileMenu=$("#mobileMenu");
const mobileOverlay=$("#mobileOverlay");
const menuClose=$("#menuClose");

function openMenu(){
mobileMenu?.classList.add("open");
mobileOverlay?.classList.add("open");
document.body.style.overflow="hidden";
}

function closeMenu(){
mobileMenu?.classList.remove("open");
mobileOverlay?.classList.remove("open");
document.body.style.overflow="";
}

hamburger?.addEventListener("click",openMenu);
menuClose?.addEventListener("click",closeMenu);
mobileOverlay?.addEventListener("click",closeMenu);

$$(".mobile-link").forEach(l=>{
l.addEventListener("click",closeMenu);
});

/* ================================
   HERO ENTRANCE
================================ */
gsap.timeline({delay:0.3})
.from(".hero-badge",{y:30,opacity:0,duration:0.6})
.from("#heroContent h1",{y:40,opacity:0,duration:0.8},"-=0.3")
.from(".hero-sub",{y:30,opacity:0,duration:0.6},"-=0.4")
.from(".hero-btns",{y:20,opacity:0,duration:0.5},"-=0.4")
.from(".hero-stats .stat-item",{y:20,opacity:0,stagger:0.12,duration:0.5},"-=0.3");

/* ================================
   COUNTERS
================================ */
function runCounter(el){

const target = parseInt(el.dataset.target);
const suffix = el.dataset.suffix || "";

let start = null;

function animate(timestamp){

if(!start) start = timestamp;

const progress = Math.min((timestamp - start) / 1500, 1);
const ease = 1 - Math.pow(1 - progress, 3);

const value = Math.floor(ease * target);

el.textContent = value + suffix;

if(progress < 1){
requestAnimationFrame(animate);
}else{
el.textContent = target + suffix;
}

}

requestAnimationFrame(animate);

}

const counters=$$(".counter");

const counterObserver=new IntersectionObserver(entries=>{

entries.forEach(entry=>{
if(entry.isIntersecting){
runCounter(entry.target);
counterObserver.unobserve(entry.target);
}
});

},{threshold:0.4});

counters.forEach(c=>counterObserver.observe(c));

/* ================================
   SCROLL ANIMATIONS
================================ */

function animate(selector,config){

if(!document.querySelector(selector)) return;

gsap.from(selector,{
...config,
scrollTrigger:{
trigger:config.trigger || selector,
start:"top 85%",
invalidateOnRefresh:true
}
});

}

/* ABOUT */
animate("#aboutImg",{x:-60,opacity:0,duration:0.8});
animate("#aboutText",{x:60,opacity:0,duration:0.8});
animate(".about-feat",{y:20,opacity:0,stagger:0.1});

/* SERVICES */
animate(".service-card",{y:40,opacity:0,stagger:0.08});

/* PROCESS */
animate(".process-step",{y:30,opacity:0,stagger:0.12});

/* GALLERY */
animate(".gallery-item",{scale:0.95,opacity:0,stagger:0.07});

/* WHY */
animate(".why-item",{x:-40,opacity:0,stagger:0.12});
animate(".why-card",{scale:0.9,opacity:0,stagger:0.1});

/* TESTIMONIALS */
animate(".testimonial-card",{y:40,opacity:0,stagger:0.1});

/* CONTACT */
animate("#contactInfo .contact-card",{x:-30,opacity:0,stagger:0.08});
animate("#contactForm",{x:40,opacity:0,duration:0.8});

/* ================================
   HERO PARALLAX
================================ */

const heroGrid=$(".hero-grid");
const orb1=$(".hero-orb");
const orb2=$(".hero-orb2");

let ticking=false;

function updateParallax(){

let y=window.scrollY;

if(heroGrid) heroGrid.style.transform=`translateY(${y*0.3}px)`;
if(orb1) orb1.style.transform=`translateY(${y*0.15}px)`;
if(orb2) orb2.style.transform=`translateY(${y*0.1}px)`;

ticking=false;

}

window.addEventListener("scroll",()=>{

if(!ticking){
requestAnimationFrame(updateParallax);
ticking=true;
}

},{passive:true});

/* ================================
   CONTACT FORM VALIDATION
================================ */

const form=$("#contactForm");
const submit=$("#submitBtn");
const success=$("#formSuccess");

if(form){

const rules={
"name":v=>/^[a-zA-Z\s]{3,80}$/.test(v),
"phone":v=>/^[6-9][0-9]{9}$/.test(v),
"email":v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
"service":v=>v!=="",
"message":v=>v.length>=10
};

form.addEventListener("submit",e=>{

e.preventDefault();

let valid=true;

Object.keys(rules).forEach(name=>{

const field=form.querySelector(`[name="${name}"]`);
const val=field.value.trim();

if(!rules[name](val)){
field.classList.add("invalid");
valid=false;
}else{
field.classList.remove("invalid");
field.classList.add("valid");
}

});

if(!valid){
submit.classList.add("shake");
setTimeout(()=>submit.classList.remove("shake"),400);
return;
}

submit.disabled=true;
submit.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

setTimeout(()=>{

form.reset();
submit.disabled=false;
submit.innerHTML='<i class="fa-solid fa-paper-plane"></i> Send Enquiry';

success?.classList.add("visible");

setTimeout(()=>{
success?.classList.remove("visible");
},5000);

},1500);

});

}

/* ================================
   FINAL SCROLLTRIGGER FIX
================================ */

setTimeout(()=>{
ScrollTrigger.refresh();
},600);

});