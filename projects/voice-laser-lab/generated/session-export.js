// src/session/wav.ts
function encodeFloatWav(pcm, sampleRate) {
  validateSampleRate(sampleRate);
  const dataLength = pcm.length * 4;
  if (dataLength > 4294967295 - 48) throw new Error("Recording is too large for a WAV file.");
  const bytes = new Uint8Array(56 + dataLength);
  const view = new DataView(bytes.buffer);
  writeText(bytes, 0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  writeText(bytes, 8, "WAVE");
  writeText(bytes, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 3, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 32, true);
  writeText(bytes, 36, "fact");
  view.setUint32(40, 4, true);
  view.setUint32(44, pcm.length, true);
  writeText(bytes, 48, "data");
  view.setUint32(52, dataLength, true);
  for (let i = 0; i < pcm.length; i++) {
    if (!Number.isFinite(pcm[i])) throw new Error(`Audio sample ${i} is not finite.`);
    view.setFloat32(56 + i * 4, pcm[i], true);
  }
  return bytes;
}
function validateSampleRate(value) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 4294967295 / 4) {
    throw new Error("Audio sample rate must be a positive integer.");
  }
}
function writeText(bytes, offset, value) {
  for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i);
}

// node_modules/fflate/esm/browser.js
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i = 0; i < 31; ++i) {
    b[i] = start += 1 << eb[i - 1];
  }
  var r = new i32(b[30]);
  for (var i = 1; i < 30; ++i) {
    for (var j = b[i]; j < b[i + 1]; ++j) {
      r[j] = j - b[i] << 5 | i;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i = 0;
  var l = new u16(mb);
  for (; i < s; ++i) {
    if (cd[i])
      ++l[cd[i] - 1];
  }
  var le = new u16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = le[i - 1] + l[i - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        var sv = i << 4 | cd[i];
        var r_1 = mb - cd[i];
        var v = le[cd[i] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flm = /* @__PURE__ */ hMap(flt, 9, 0);
var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
  var t = [];
  for (var i = 0; i < d.length; ++i) {
    if (d[i])
      t.push({ s: i, f: d[i] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort(function(a, b) {
    return a.f - b.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i2].f ? i0++ : i2++];
    r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i = 1; i < s; ++i) {
    if (t2[i].s > maxSym)
      maxSym = t2[i].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (; i < s; ++i) {
      var i2_1 = t2[i].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i;
    }
    for (; i >= 0 && dt; --i) {
      var i2_3 = t2[i].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
};
var ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i = 1; i <= s; ++i) {
    if (c[i] == cln && i != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (; cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (; cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
};
var clen = function(cf, cl) {
  var l = 0;
  for (var i = 0; i < cl.length; ++i)
    l += cf[i] * cl[i];
  return l;
};
var wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i = 0; i < s; ++i)
    out[o + i + 4] = dat[i];
  return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i = 0; i < lclt.length; ++i)
    ++lcfreq[lclt[i] & 31];
  for (var i = 0; i < lcdt.length; ++i)
    ++lcfreq[lcdt[i] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i = 0; i < nlcc; ++i)
      wbits(out, p + 3 * i, lct[clim[i]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0; it < 2; ++it) {
      var clct = lcts[it];
      for (var i = 0; i < clct.length; ++i) {
        var len = clct[i] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i = 0; i < li; ++i) {
    var sym = syms[i];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
};
var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
var et = /* @__PURE__ */ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i2) {
      return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25e3);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (; i + 2 < s; ++i) {
      var hv = hsh(i);
      var imod = i & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i) {
        var rem = s - i;
        if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
          li = lc_1 = eb = 0, bs = i;
          for (var j = 0; j < 286; ++j)
            lf[j] = 0;
          for (var j = 0; j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i + l] == dat[i + l - dif]) {
              var nl = 0;
              for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0; j < mmd; ++j) {
                  var ti = i - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i];
          ++lf[dat[i]];
        }
      }
    }
    for (i = Math.max(i, wi); i < s; ++i) {
      syms[li++] = dat[i];
      ++lf[dat[i]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i, st.w = wi;
    }
  } else {
    for (var i = st.w || 0; i < s + lst; i += 65535) {
      var e = i + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
};
var crct = /* @__PURE__ */ (function() {
  var t = new Int32Array(256);
  for (var i = 0; i < 256; ++i) {
    var c = i, k = 9;
    while (--k)
      c = (c & 1 && -306674912) ^ c >>> 1;
    t[i] = c;
  }
  return t;
})();
var crc = function() {
  var c = -1;
  return {
    p: function(d) {
      var cr = c;
      for (var i = 0; i < d.length; ++i)
        cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
      c = cr;
    },
    d: function() {
      return ~c;
    }
  };
};
var dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a, b) {
  var o = {};
  for (var k in a)
    o[k] = a[k];
  for (var k in b)
    o[k] = b[k];
  return o;
};
var wbytes = function(d, b, v) {
  for (; v; ++b)
    d[b] = v, v >>>= 8;
};
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
var fltn = function(d, p, t, o) {
  for (var k in d) {
    var val = d[k], n = p + k, op = o;
    if (Array.isArray(val))
      op = mrg(o, val[1]), val = val[0];
    if (ArrayBuffer.isView(val))
      t[n] = [val, op];
    else {
      t[n += "/"] = [new u8(0), op];
      fltn(val, n, t, o);
    }
  }
};
var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i = 0; i < str.length; ++i)
      ar_1[i] = str.charCodeAt(i);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v) {
    ar[ai++] = v;
  };
  for (var i = 0; i < l; ++i) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i);
    if (c < 128 || latin1)
      w(c);
    else if (c < 2048)
      w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344)
      c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else
      w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
var exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k in ex) {
      var l = ex[k].length;
      if (l > 65535)
        err(9);
      le += l + 4;
    }
  }
  return le;
};
var wzh = function(d, b, f, fn, u, c, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null)
    d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119)
    err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) {
    for (var k in ex) {
      var exf = ex[k], l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4), b += 4 + l;
    }
  }
  if (col)
    d.set(co, b), b += col;
  return b;
};
var wzf = function(o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r = {};
  var files = [];
  fltn(data, "", r, opts);
  var o = 0;
  var tot = 0;
  for (var fn in r) {
    var _a2 = r[fn], file = _a2[0], p = _a2[1];
    var compression = p.level == 0 ? 0 : 8;
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    if (s > 65535)
      err(11);
    var d = compression ? deflateSync(file, p) : file, l = d.length;
    var c = crc();
    c.p(file);
    files.push(mrg(p, {
      size: file.length,
      crc: c.d(),
      c: d,
      f,
      m,
      u: s != fn.length || m && com.length != ms,
      o,
      compression
    }));
    o += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22), oe = o, cdl = tot - o;
  for (var i = 0; i < files.length; ++i) {
    var f = files[i];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o, files.length, cdl, oe);
  return out;
}

// src/physics/engine.ts
var DEFAULT_CONFIG = {
  gain: 1,
  tension: 1,
  damping: 0.03,
  asymmetry: 0.12,
  wallDistance: 2
};
var MODEL_VERSION = "membrane-six-mode-v1";
var TOY = {
  cylinderRadius: 0.05,
  cylinderLength: 0.2,
  mirrorRadius: 8e-3,
  laserPosition: [0.075, 0, 0.32],
  wallWidth: 2,
  wallHeight: 2
};
var MODE_COUNT = 6;
var FUNDAMENTAL_HZ = 125;
var PRESSURE_ACCELERATION = 1800;
var ROOT_01 = 2.404825557695773;
var ROOT_02 = 5.520078110286311;
var ROOT_11 = 3.8317059702075125;
var ROOT_12 = 7.015586669815619;
var ROOTS = [ROOT_01, ROOT_02, ROOT_11, ROOT_11, ROOT_12, ROOT_12];
var AXES = [0, 0, 1, 2, 1, 2];
var DAMPING_WEIGHTS = [2.8, 2, 1, 1, 1.15, 1.15];
var SPLITS = [0, 0, -0.55, 0.55, -0.3, 0.3];
function besselJ0(x) {
  const factor = -x * x / 4;
  let term = 1;
  let sum = 1;
  for (let k = 1; k < 40; k++) {
    term *= factor / (k * k);
    sum += term;
    if (Math.abs(term) < 1e-16) break;
  }
  return sum;
}
function besselJ1(x) {
  const factor = -x * x / 4;
  let term = x / 2;
  let sum = term;
  for (let k = 1; k < 40; k++) {
    term *= factor / (k * (k + 1));
    sum += term;
    if (Math.abs(term) < 1e-16) break;
  }
  return sum;
}
function besselJ2(x) {
  if (Math.abs(x) < 1e-4) return x * x / 8 - x ** 4 / 96;
  return 2 * besselJ1(x) / x - besselJ0(x);
}
var NORMALIZERS = ROOTS.map((root, i) => AXES[i] === 0 ? Math.abs(besselJ1(root)) : Math.abs(besselJ2(root)) / Math.SQRT2);
var MIRROR_HEIGHT = ROOTS.map((root, i) => {
  const x = root * TOY.mirrorRadius / TOY.cylinderRadius;
  return AXES[i] === 0 ? 2 * besselJ1(x) / (x * NORMALIZERS[i]) : 0;
});
var MIRROR_SLOPE = ROOTS.map((root, i) => {
  const k = root / TOY.cylinderRadius;
  return AXES[i] === 0 ? 0 : 4 * besselJ2(k * TOY.mirrorRadius) / (k * TOY.mirrorRadius ** 2 * NORMALIZERS[i]);
});
function neutralWallX(distance) {
  return -TOY.laserPosition[0] / TOY.laserPosition[2] * distance;
}
var LASER_LENGTH = Math.hypot(...TOY.laserPosition);
var DX = -TOY.laserPosition[0] / LASER_LENGTH;
var DY = -TOY.laserPosition[1] / LASER_LENGTH;
var DZ = -TOY.laserPosition[2] / LASER_LENGTH;
function castLaser(cx, cy, cz, nx, ny, nz, distance, result) {
  result.hit = false;
  result.mirrorHit = false;
  result.x = Number.NaN;
  result.y = Number.NaN;
  const dot = DX * nx + DY * ny + DZ * nz;
  if (Math.abs(dot) < 1e-12) return;
  const t = ((cx - TOY.laserPosition[0]) * nx + (cy - TOY.laserPosition[1]) * ny + (cz - TOY.laserPosition[2]) * nz) / dot;
  if (t <= 0 || !Number.isFinite(t)) return;
  const hx = TOY.laserPosition[0] + DX * t;
  const hy = TOY.laserPosition[1] + DY * t;
  const hz = TOY.laserPosition[2] + DZ * t;
  if ((hx - cx) ** 2 + (hy - cy) ** 2 + (hz - cz) ** 2 > TOY.mirrorRadius ** 2) return;
  result.mirrorHit = true;
  result.hx = hx;
  result.hy = hy;
  result.hz = hz;
  const rx = DX - 2 * dot * nx;
  const ry = DY - 2 * dot * ny;
  const rz = DZ - 2 * dot * nz;
  if (rz <= 1e-12) return;
  const wallT = (distance - hz) / rz;
  if (wallT <= 0 || !Number.isFinite(wallT)) return;
  const x = hx + wallT * rx;
  const y = hy + wallT * ry;
  if (Math.abs(x - neutralWallX(distance)) > TOY.wallWidth / 2 || Math.abs(y) > TOY.wallHeight / 2) return;
  result.hit = true;
  result.x = x;
  result.y = y;
}
function validateConfig(config) {
  for (const name of Object.keys(DEFAULT_CONFIG)) {
    if (!Number.isFinite(config[name])) throw new RangeError(`${name} must be finite.`);
  }
  if (config.gain < 0 || config.gain > 50) throw new RangeError("Gain must be between 0 and 50.");
  if (config.tension < 0.05 || config.tension > 20) throw new RangeError("Tension must be between 0.05 and 20.");
  if (config.damping < 0 || config.damping > 1) throw new RangeError("Damping must be between 0 and 1.");
  if (config.asymmetry < 0 || config.asymmetry > 1) throw new RangeError("Asymmetry must be between 0 and 1.");
  if (config.wallDistance < 0.1 || config.wallDistance > 100) throw new RangeError("Wall distance must be between 0.1 and 100 metres.");
}
var Simulator = class {
  constructor(config = DEFAULT_CONFIG, sampleRate = 48e3, initialState) {
    this.sampleIndex = 0;
    this.q = new Float64Array(MODE_COUNT);
    this.v = new Float64Array(MODE_COUNT);
    // Per-mode affine recurrence [m00,m01,m10,m11,bq,bv].
    this.coefficients = new Float64Array(MODE_COUNT * 6);
    this.centerZ = 0;
    this.nx = 0;
    this.ny = 0;
    this.nz = 1;
    this.ray = { hit: false, x: NaN, y: NaN, mirrorHit: false, hx: 0, hy: 0, hz: 0 };
    validateConfig(config);
    if (!Number.isFinite(sampleRate) || sampleRate < 8e3 || sampleRate > 384e3) {
      throw new RangeError("Sample rate must be between 8000 and 384000 Hz.");
    }
    this.config = { ...config };
    this.sampleRate = sampleRate;
    this.updateCoefficients();
    this.reset(initialState);
  }
  setConfig(patch) {
    const config = { ...this.config, ...patch };
    validateConfig(config);
    this.config = config;
    this.updateCoefficients();
    this.updateFrame();
  }
  getConfig() {
    return { ...this.config };
  }
  reset(state) {
    if (state) {
      if (!Number.isSafeInteger(state.sampleIndex) || state.sampleIndex < 0 || state.q.length !== MODE_COUNT || state.v.length !== MODE_COUNT || !state.q.every(Number.isFinite) || !state.v.every(Number.isFinite)) {
        throw new RangeError("State needs a nonnegative sample index and six finite q/v entries.");
      }
      this.sampleIndex = state.sampleIndex;
      this.q.set(state.q);
      this.v.set(state.v);
    } else {
      this.sampleIndex = 0;
      this.q.fill(0);
      this.v.fill(0);
    }
    this.updateFrame();
  }
  getState() {
    return { sampleIndex: this.sampleIndex, q: Array.from(this.q), v: Array.from(this.v) };
  }
  getFrame() {
    return {
      sampleIndex: this.sampleIndex,
      x: this.ray.x,
      y: this.ray.y,
      hit: this.ray.hit,
      mirrorCenter: [0, 0, this.centerZ],
      mirrorNormal: [this.nx, this.ny, this.nz],
      mirrorHit: this.ray.mirrorHit ? [this.ray.hx, this.ray.hy, this.ray.hz] : null,
      modes: Array.from(this.q)
    };
  }
  process(pcm) {
    const count = pcm.length;
    const startSample = this.sampleIndex;
    const xy = new Float32Array(count * 2);
    const hits = new Uint8Array(count);
    const q = this.q;
    const v = this.v;
    const c = this.coefficients;
    for (let sample = 0; sample < count; sample++) {
      const input = Number.isFinite(pcm[sample]) ? pcm[sample] : 0;
      for (let mode = 0; mode < MODE_COUNT; mode++) {
        const i = mode * 6;
        const previousQ = q[mode];
        const previousV = v[mode];
        q[mode] = c[i] * previousQ + c[i + 1] * previousV + c[i + 4] * input;
        v[mode] = c[i + 2] * previousQ + c[i + 3] * previousV + c[i + 5] * input;
      }
      this.sampleIndex++;
      this.updateFrame();
      xy[sample * 2] = this.ray.x;
      xy[sample * 2 + 1] = this.ray.y;
      hits[sample] = this.ray.hit ? 1 : 0;
    }
    return { startSample, count, xy, hits, lastFrame: this.getFrame() };
  }
  updateCoefficients() {
    const h = 1 / this.sampleRate;
    for (let mode = 0; mode < MODE_COUNT; mode++) {
      const root = ROOTS[mode];
      const omega = 2 * Math.PI * FUNDAMENTAL_HZ * root / ROOT_01 * Math.sqrt(this.config.tension) * (1 + SPLITS[mode] * this.config.asymmetry);
      const omega2 = omega * omega;
      const a = this.config.damping * DAMPING_WEIGHTS[mode] * omega;
      const discriminant = a * a - omega2;
      let ec2;
      let es;
      if (Math.abs(discriminant) < 1e-12 * omega2) {
        ec2 = Math.exp(-a * h);
        es = h * ec2;
      } else if (discriminant < 0) {
        const wd = Math.sqrt(-discriminant);
        const envelope = Math.exp(-a * h);
        ec2 = envelope * Math.cos(wd * h);
        es = envelope * Math.sin(wd * h) / wd;
      } else {
        const wd = Math.sqrt(discriminant);
        const plus = Math.exp((-a + wd) * h);
        const minus = Math.exp((-a - wd) * h);
        ec2 = (plus + minus) / 2;
        es = (plus - minus) / (2 * wd);
      }
      const coupling = AXES[mode] === 0 ? 2 * besselJ1(root) / (root * NORMALIZERS[mode]) : this.config.asymmetry * (AXES[mode] === 1 ? 1 : 0.83) * besselJ2(root) / (root * NORMALIZERS[mode]);
      const equilibrium = coupling * PRESSURE_ACCELERATION * this.config.gain / omega2;
      const i = mode * 6;
      this.coefficients[i] = ec2 + a * es;
      this.coefficients[i + 1] = es;
      this.coefficients[i + 2] = -omega2 * es;
      this.coefficients[i + 3] = ec2 - a * es;
      this.coefficients[i + 4] = (1 - this.coefficients[i]) * equilibrium;
      this.coefficients[i + 5] = -this.coefficients[i + 2] * equilibrium;
    }
  }
  updateFrame() {
    this.centerZ = this.q[0] * MIRROR_HEIGHT[0] + this.q[1] * MIRROR_HEIGHT[1];
    const slopeX = this.q[2] * MIRROR_SLOPE[2] + this.q[4] * MIRROR_SLOPE[4];
    const slopeY = this.q[3] * MIRROR_SLOPE[3] + this.q[5] * MIRROR_SLOPE[5];
    const length = Math.hypot(slopeX, slopeY, 1);
    this.nx = -slopeX / length;
    this.ny = -slopeY / length;
    this.nz = 1 / length;
    castLaser(0, 0, this.centerZ, this.nx, this.ny, this.nz, this.config.wallDistance, this.ray);
  }
};

// src/session/replay.ts
var CONFIG_KEYS = Object.keys(DEFAULT_CONFIG);
function validateSessionMetadata(value) {
  if (!isRecord(value)) throw new Error("Session metadata must be an object.");
  if (value.modelVersion !== MODEL_VERSION) {
    throw new Error(`Unsupported model version ${String(value.modelVersion)}. This app uses ${MODEL_VERSION}.`);
  }
  validateSampleRate(value.sampleRate);
  if (value.sampleRate < 8e3 || value.sampleRate > 384e3) {
    throw new Error("Session sample rate must be between 8000 and 384000 Hz.");
  }
  if (!Number.isSafeInteger(value.sampleCount) || value.sampleCount < 0) {
    throw new Error("Session sample count must be a non-negative integer.");
  }
  validateConfig2(value.initialConfig, false);
  let config = value.initialConfig;
  validateConfig(config);
  if (!isRecord(value.initialState) || !Number.isSafeInteger(value.initialState.sampleIndex) || value.initialState.sampleIndex < 0) {
    throw new Error("Session starting state has an invalid sample index.");
  }
  for (const field of ["q", "v"]) {
    const items = value.initialState[field];
    if (!Array.isArray(items) || items.length !== 6 || !items.every(Number.isFinite)) {
      throw new Error(`Session starting state must contain six finite ${field} values.`);
    }
  }
  const start = value.initialState.sampleIndex;
  const end = start + value.sampleCount;
  if (!Number.isSafeInteger(end)) throw new Error("Session sample range is too large.");
  if (!Array.isArray(value.parameterEvents)) throw new Error("Session parameter events must be an array.");
  let previous = start;
  for (const event of value.parameterEvents) {
    if (!isRecord(event) || !Number.isSafeInteger(event.sampleIndex) || event.sampleIndex < previous || event.sampleIndex > end) {
      throw new Error("Session parameter events must be ordered sample boundaries within the recording.");
    }
    validateConfig2(event.patch, true);
    config = { ...config, ...event.patch };
    validateConfig(config);
    previous = event.sampleIndex;
  }
}
function validateSession(session) {
  validateSessionMetadata(session.metadata);
  if (!(session.pcm instanceof Float32Array) || session.pcm.length !== session.metadata.sampleCount) {
    throw new Error("Session PCM length does not match its sample count.");
  }
  for (let i = 0; i < session.pcm.length; i++) {
    if (!Number.isFinite(session.pcm[i])) throw new Error(`Session audio sample ${i} is not finite.`);
  }
}
var SessionReplayer = class {
  constructor(session) {
    this.offset = 0;
    this.eventIndex = 0;
    validateSession(session);
    this.session = session;
    this.currentConfig = { ...session.metadata.initialConfig };
    this.simulator = new Simulator(this.currentConfig, session.metadata.sampleRate, session.metadata.initialState);
    this.applyEvents();
  }
  get position() {
    return this.offset;
  }
  get done() {
    return this.offset === this.session.pcm.length;
  }
  get config() {
    return { ...this.currentConfig };
  }
  processNext(maxFrames = 4096) {
    if (!Number.isSafeInteger(maxFrames) || maxFrames < 1) throw new Error("Replay block size must be a positive integer.");
    if (this.done) return null;
    const count = Math.min(maxFrames, this.session.pcm.length - this.offset);
    const startSample = this.session.metadata.initialState.sampleIndex + this.offset;
    const xy = new Float32Array(count * 2);
    const hits = new Uint8Array(count);
    let written = 0;
    while (written < count) {
      this.applyEvents();
      const nextEvent = this.session.metadata.parameterEvents[this.eventIndex];
      const now = this.session.metadata.initialState.sampleIndex + this.offset;
      const segmentLength = Math.min(count - written, nextEvent ? nextEvent.sampleIndex - now : Infinity);
      const block = this.simulator.process(this.session.pcm.subarray(this.offset, this.offset + segmentLength));
      xy.set(block.xy, written * 2);
      hits.set(block.hits, written);
      this.offset += segmentLength;
      written += segmentLength;
      this.applyEvents();
    }
    return { startSample, count, xy, hits, lastFrame: this.simulator.getFrame() };
  }
  applyEvents() {
    const events = this.session.metadata.parameterEvents;
    const absoluteIndex = this.session.metadata.initialState.sampleIndex + this.offset;
    while (this.eventIndex < events.length && events[this.eventIndex].sampleIndex === absoluteIndex) {
      const { patch } = events[this.eventIndex++];
      this.currentConfig = { ...this.currentConfig, ...patch };
      this.simulator.setConfig(patch);
    }
  }
};
function createSessionReplayer(session) {
  return new SessionReplayer(session);
}
function replaySession(session, options = {}) {
  const replayer = createSessionReplayer(session);
  while (!replayer.done) {
    const block = replayer.processNext(options.chunkSize ?? 4096);
    options.onTrace?.(block);
  }
  return {
    finalState: replayer.simulator.getState(),
    finalConfig: replayer.config,
    sampleCount: replayer.position
  };
}
var TRACE_CSV_HEADER = "sampleIndex,timeSeconds,x,y,hit\n";
function traceBlockToCsv(block, sampleRate, includeHeader = false) {
  validateSampleRate(sampleRate);
  const rows = new Array(block.count);
  for (let i = 0; i < block.count; i++) {
    const sampleIndex = block.startSample + i + 1;
    const x = block.hits[i] ? block.xy[i * 2] : "";
    const y = block.hits[i] ? block.xy[i * 2 + 1] : "";
    rows[i] = `${sampleIndex},${sampleIndex / sampleRate},${x},${y},${block.hits[i]}
`;
  }
  return (includeHeader ? TRACE_CSV_HEADER : "") + rows.join("");
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateConfig2(value, partial) {
  if (!isRecord(value)) throw new Error("Session parameters must be an object.");
  if (!partial && CONFIG_KEYS.some((key) => !(key in value))) throw new Error("Session parameters are incomplete.");
  for (const [key, item] of Object.entries(value)) {
    if (!CONFIG_KEYS.includes(key) || typeof item !== "number" || !Number.isFinite(item)) {
      throw new Error(`Invalid session parameter: ${key}.`);
    }
  }
}

// src/session/archive.ts
function encodeSessionZip(session, options = {}) {
  validateSession(session);
  const files = {
    "session.json": strToU8(JSON.stringify(session.metadata, null, 2)),
    "audio.wav": encodeFloatWav(session.pcm, session.metadata.sampleRate)
  };
  if (options.includeTrace !== false) {
    const parts = [TRACE_CSV_HEADER];
    replaySession(session, { onTrace: (block) => parts.push(traceBlockToCsv(block, session.metadata.sampleRate)) });
    files["trace.csv"] = strToU8(parts.join(""));
  }
  return zipSync(files, { level: 1 });
}

// src/audio/export-worker.ts
self.onmessage = async ({ data }) => {
  try {
    const bytes = await encodeSessionZip(data, { includeTrace: true });
    self.postMessage({ bytes }, { transfer: [bytes.buffer] });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
