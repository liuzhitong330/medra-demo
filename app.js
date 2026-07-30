(function(){
  var D = window.MED;
  var ASSAYS = D.assays, META = D.meta, STATS = D.stats, ABS = D.abs;
  var SVGNS = "http://www.w3.org/2000/svg";
  var ACC = "#3a4db8", FLAG = "#c0392b";

  function el(tag, attrs, txt){var e=document.createElementNS(SVGNS,tag);for(var k in attrs)e.setAttribute(k,attrs[k]);if(txt!=null)e.textContent=txt;return e;}
  function esc(s){return (s+"").replace(/[&<>]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}

  var names=Object.keys(ABS).sort();
  (function(){var dl=document.getElementById("ablist"),f=document.createDocumentFragment();for(var i=0;i<names.length;i++){var o=document.createElement("option");o.value=names[i];f.appendChild(o);}dl.appendChild(f);})();
  function findCI(name){var up=name.toLowerCase();for(var i=0;i<names.length;i++){if(names[i].toLowerCase()===up)return names[i];}return null;}

  // 12-row assay profile
  var W=600, H=470, L=132, R=40, T=16, B=26;
  var iw=W-L-R, ih=H-T-B, rowH=ih/ASSAYS.length;

  function frac(s,val){
    var mn=s.min, mx=s.max; if(mx<=mn) return 0.5;
    var f=(val-mn)/(mx-mn); return f<0?0:(f>1?1:f);
  }

  function draw(ab){
    var rec=ABS[ab];
    var svg=document.getElementById("scatter"); svg.innerHTML="";
    for(var i=0;i<ASSAYS.length;i++){
      var a=ASSAYS[i], s=STATS[a], m=META[a];
      var y=T+i*rowH, yc=y+rowH*0.5;
      var tx0=L, tx1=L+iw;
      // label + unit
      svg.appendChild(el("text",{x:L-8,y:yc-1,"text-anchor":"end","font-size":11,"font-family":"system-ui,sans-serif",fill:"#333","font-weight":600},a));
      svg.appendChild(el("text",{x:L-8,y:yc+10,"text-anchor":"end","font-size":8.5,"font-family":"system-ui,sans-serif",fill:"#aaa"},m.unit));
      // flag zone shading (bad direction, beyond cutoff)
      var fc=frac(s,s.cutoff);
      if(s.dir==="hi"){
        svg.appendChild(el("rect",{x:tx0+fc*iw,y:y+rowH*0.28,width:(1-fc)*iw,height:rowH*0.44,fill:"#f6d5d5"}));
      } else {
        svg.appendChild(el("rect",{x:tx0,y:y+rowH*0.28,width:fc*iw,height:rowH*0.44,fill:"#f6d5d5"}));
      }
      // baseline track
      svg.appendChild(el("line",{x1:tx0,y1:yc,x2:tx1,y2:yc,stroke:"#d5d7e2","stroke-width":2}));
      // median tick
      var fmed=frac(s,s.p50);
      svg.appendChild(el("line",{x1:tx0+fmed*iw,y1:yc-5,x2:tx0+fmed*iw,y2:yc+5,stroke:"#b9bcce","stroke-width":1.5}));
      // antibody marker
      var v=rec.v[a];
      if(v===null||v===undefined){
        svg.appendChild(el("text",{x:tx1+4,y:yc+3.5,"font-size":9,"font-family":"system-ui,sans-serif",fill:"#bbb"},"n/a"));
        continue;
      }
      var fx=tx0+frac(s,v)*iw, flagged=rec.f[a]===1;
      svg.appendChild(el("circle",{cx:fx,cy:yc,r:5,fill:flagged?FLAG:ACC,stroke:"#fff","stroke-width":1.5}));
      svg.appendChild(el("text",{x:tx1+4,y:yc+3.5,"font-size":9,"font-family":"system-ui,sans-serif",fill:flagged?FLAG:"#888","font-weight":flagged?700:400}, fmtVal(v)));
    }
    // worse-direction arrows footer
    svg.appendChild(el("text",{x:L,y:H-6,"font-size":9,"font-family":"system-ui,sans-serif",fill:"#bbb"},"best"));
    svg.appendChild(el("text",{x:L+iw,y:H-6,"text-anchor":"end","font-size":9,"font-family":"system-ui,sans-serif",fill:"#c0392b"},"worse  (red zone = worst 10%)"));
  }
  function fmtVal(v){ var a=Math.abs(v); return a>=100?v.toFixed(0):(a>=1?v.toFixed(1):v.toFixed(2)); }

  function renderLegend(){
    document.getElementById("legend").innerHTML=
      '<span class="k" style="--c:'+ACC+'">this antibody</span>'
      +'<span class="k" style="--c:'+FLAG+'">flagged (worst 10%)</span>'
      +'<span class="k kz">flag zone</span>';
  }

  function statusWord(s){ return s? s : "clinical stage"; }

  function describe(ab){
    var rec=ABS[ab], nf=rec.nf, st=rec.status;
    var flags=ASSAYS.filter(function(a){return rec.f[a]===1;});
    var s="<b>"+ab+"</b> ("+statusWord(st)+") carries <b>"+nf+(nf===1?" red flag":" red flags")+"</b> across the 12 assays. ";
    if(nf===0){
      s+="It sits in the clean range on every assay, the biophysical profile you want in a molecule that advances.";
    } else {
      s+="Flagged on: "+flags.join(", ")+". ";
      var nonspec=flags.filter(function(a){return META[a].tag.indexOf("specif")>=0||a==="AC-SINS"||a==="CSI-BLI"||a==="SMAC"||a==="CIC";}).length;
      if(nonspec>=2) s+="Most of these are self-interaction and non-specificity liabilities, the pattern that tends to predict poor pharmacokinetics.";
      else s+="Compare it with adalimumab, which flags on none.";
    }
    return s;
  }

  function updateMetric(ab){
    var rec=ABS[ab];
    document.getElementById("m-dir").textContent = rec.nf+(rec.nf===1?" flag":" flags");
    document.getElementById("m-dir-d").textContent = ab+(rec.status?" ("+rec.status.toLowerCase()+")":"");
  }

  function pick(nameRaw){
    var name=(nameRaw||"").trim(); if(!name) return;
    var key=ABS[name]?name:findCI(name);
    var read=document.getElementById("readout");
    if(!key){
      document.getElementById("scatter").innerHTML="";
      document.getElementById("legend").innerHTML="";
      read.innerHTML='<b>'+esc(name)+'</b> is not in this set of 137 antibodies. Try adalimumab, trastuzumab, bevacizumab, rituximab, bococizumab or briakinumab.';
      return;
    }
    document.getElementById("search").value=key;
    draw(key); renderLegend(); updateMetric(key);
    read.innerHTML=describe(key);
  }
  window.pick=pick;

  // Analysis 2: developability burden by clinical stage (does the panel predict success?)
  (function(){
    var GROUPS=[
      {key:"Approved", label:"Approved", col:"#3a7d54"},
      {key:"Phase 3",  label:"Phase 3",  col:"#c08a2a"},
      {key:"Phase 2",  label:"Phase 2",  col:FLAG}
    ];
    var box=document.getElementById("bars");
    GROUPS.forEach(function(g){
      var members=names.filter(function(n){return (ABS[n].status||"")===g.key;});
      if(!members.length) return;
      var nf=members.map(function(n){return ABS[n].nf;});
      var mean=nf.reduce(function(a,b){return a+b;},0)/members.length;
      var risky=nf.filter(function(x){return x>=2;}).length;
      var pct=100*risky/members.length;
      // representative example: cleanest for Approved, worst for others
      var rep=members.slice().sort(function(a,b){ return g.key==="Approved" ? ABS[a].nf-ABS[b].nf : ABS[b].nf-ABS[a].nf; })[0];
      var row=document.createElement("div"); row.className="brow";
      row.innerHTML='<div class="bname">'+g.label+'</div>'
        +'<div class="btrack"><div class="bfill" style="width:'+pct.toFixed(0)+'%;background:'+g.col+'"></div></div>'
        +'<div class="bnum">'+pct.toFixed(0)+'% risky &middot; '+mean.toFixed(2)+' avg</div>';
      row.title="click for an example: "+rep;
      row.onclick=(function(n){return function(){pick(n);window.scrollTo({top:0,behavior:"smooth"});};})(rep);
      box.appendChild(row);
    });
  })();

  var input=document.getElementById("search");
  input.addEventListener("change",function(){pick(input.value);});
  input.addEventListener("keydown",function(e){if(e.key==="Enter")pick(input.value);});

  pick("adalimumab");
})();
