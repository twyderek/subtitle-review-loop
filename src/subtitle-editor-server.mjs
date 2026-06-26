import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const port = 8787;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".srt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg"
};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const target = path.resolve(root, url === "/" ? "edit/subtitle-editor.html" : url.slice(1));

  if (!target.startsWith(path.resolve(root))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(target, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const contentType = types[path.extname(target).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range;

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        res.writeHead(416);
        res.end();
        return;
      }

      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : stat.size - 1;
      res.writeHead(206, {
        "Content-Type": contentType,
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes"
      });
      fs.createReadStream(target, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes"
    });
    fs.createReadStream(target).pipe(res);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Subtitle editor: http://127.0.0.1:${port}/edit/subtitle-editor.html`);
});
