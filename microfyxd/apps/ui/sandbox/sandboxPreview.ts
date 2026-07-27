/**
 * SandboxPreview — builds a runnable HTML blob from the file map.
 * If index.html exists, injects all JS/CSS files inline. Otherwise
 * generates a minimal HTML shell from app.js / styles.css / App.tsx.
 */

import { FileMap } from './sandboxManager';

export function buildPreviewHTML(files: FileMap): string {
  if (files['index.html']) {
    let html = files['index.html'];
    if (files['styles.css'] || files['index.css']) {
      const css = files['styles.css'] || files['index.css'];
      html = html.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
    }
    if (files['app.js'] || files['index.js']) {
      const js = files['app.js'] || files['index.js'];
      html = html.replace('</body>', `<script>\n${js}\n</script>\n</body>`);
    }
    if (files['App.tsx']) {
      html = html.replace('</head>', `<script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>\n</head>`);
      html = html.replace('</body>', `<script type="text/babel">\n${files['App.tsx']}\n</script>\n</body>`);
    }
    return html;
  }

  const css = files['styles.css'] || files['index.css'] || '';
  const js = files['app.js'] || files['index.js'] || '';
  const tsx = files['App.tsx'] || '';

  if (tsx) {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Preview</title>
<script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
${tsx}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
</script>
</body>
</html>`;
  }

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Preview</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>`;
}
