const offices = [
  ["Tauranga", "https://rwtauranga.co.nz/properties/residential-for-rent?category=&suburbPostCode="],
  ["Mount", "https://rwmountmaunganui.co.nz/properties/residential-for-rent?category=&suburbPostCode="],
  ["Tauranga PM", "https://rwtaurangapm.co.nz/properties/residential-for-rent"],
];

function text(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

for (const [name,url] of offices) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent":"Mozilla/5.0 (compatible; BlenheimRentals/1.0)", "Accept":"text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();
    const hrefs = [...html.matchAll(/href\s*=\s*(["'])([^"']*\/properties\/residential-for-rent\/[^"']+)\1/gi)];
    const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*(["'])([^"']*\/properties\/residential-for-rent\/[^"']+\/\d+)\1[^>]*>([\s\S]*?)<\/a>/gi)];
    const listings = links.slice(0, 5).map(m => {
      const address=text(m[3]);
      const index=m.index??0;
      const ctxt=text(html.slice(Math.max(0,index-1400),index+m[0].length+1400));
      const addrIndex=ctxt.toLowerCase().indexOf(address.toLowerCase());
      const before=addrIndex>=0?ctxt.slice(0,addrIndex):ctxt;
      const rents=[...before.matchAll(/\$\s?([\d,]+)\s*per\s*week/gi)];
      return {address:address.slice(0,100),rent:rents.at(-1)?.[1]??null,link:m[2].slice(0,140)};
    });
    console.log(JSON.stringify({name,status:response.status,bytes:html.length,hrefs:hrefs.length,links:links.length,samples:listings},null,2));
  } catch(e) {
    console.log(JSON.stringify({name,error:String(e)}));
  }
}
