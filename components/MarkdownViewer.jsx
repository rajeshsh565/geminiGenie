import React, { useMemo, useEffect, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import he from "he";
import "highlight.js/styles/atom-one-dark.css";

marked.use({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown (tables, checklists)
  renderer: {
    code({ text, lang }) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      const highlighted = hljs.highlight(text, { language }).value;
      // store the raw, un-highlighted text in a data attribute on the <pre> tag.
      const rawText = he.encode(text);
      return `<pre style="position: relative;" data-code="${rawText}"><button class="copy-btn">Copy</button><code class="hljs language-${language}">${highlighted}</code></pre>`;
    },
  },
});

const MarkdownViewer = ({ content, role }) => {
  const containerRef = useRef(null);
  const hasHTML = /<\/?[a-z][^>]*>/i.test(content);
  const textToProcess =
    role === "user" && hasHTML ? he.encode(content) : content;

  const sanitizedHTML = useMemo(() => {
    const rawMarkup = marked.parse(textToProcess);
    return DOMPurify.sanitize(rawMarkup, {
      ADD_ATTR: ["target"],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
  }, [textToProcess]);

  useEffect(() => {
    const handleCopyClick = (event) => {
      // check if a copy button was clicked
      if (event.target.classList.contains("copy-btn")) {
        const button = event.target;
        const pre = button.closest("pre");
        const codeToCopy = pre?.dataset.code; // Get the raw code from our data attribute

        if (codeToCopy) {
          // he.decode to get the original characters back (e.g., '<' becomes '<')
          navigator.clipboard.writeText(he.decode(codeToCopy)).then(
            () => {
              // On success, update button text
              button.textContent = "Copied!";
              button.disabled = true; // Briefly disable to prevent spamming
              setTimeout(() => {
                button.textContent = "Copy";
                button.disabled = false;
              }, 3000);
            },
            (err) => {
              console.error("Failed to copy text: ", err);
              button.textContent = "Error!!";
            }
          );
        }
      }
    };

    const container = containerRef.current;
    container?.addEventListener("click", handleCopyClick);

    return () => container?.removeEventListener("click", handleCopyClick);
  }, []);

  return (
    <div
      ref={containerRef}
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
};

export default React.memo(MarkdownViewer);
