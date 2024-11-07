import Prism from 'prismjs';
import { useMemo, useRef } from 'react';
import { BaseRange, createEditor, Element, Node, NodeEntry } from 'slate';
import { withHistory } from 'slate-history';
import { Editable, Slate, withReact } from 'slate-react';

type BaseRangeCustom = BaseRange & { className: string }

function App() {

  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  // CACHE
  const cacheMem = useRef<{ text: string, ranges: BaseRange[] }[]>([])

  function decorateCode([node, path]: NodeEntry) {
    const ranges: BaseRangeCustom[] = []

    // make sure it is an Slate Element
    if ( !Element.isElement(node) ) return ranges
    // transform the Element into a string 
    const text = Node.string(node)

    // CACHE
    const index = path[0]
    const cache = cacheMem.current[index]
    if (!!cache && cache.text == text) return cache.ranges
    // CACHE

    // create "tokens" with "prismjs" and put them in "ranges"
    const tokens = Prism.tokenize(text, Prism.languages.javascript);
    let start = 0;
    for (const token of tokens) {
      const length = token.length;
      const end = start + length;
      if (typeof token !== 'string') {
        ranges.push({
          anchor: { path, offset: start },
          focus: { path, offset: end },
          className: `token ${token.type}`,
        });
      }
      start = end;
    }

    // CACHE
    cacheMem.current[index] = { text, ranges }
    // CACHE

    // these will be found in "renderLeaf" in "leaf" and their "className" will be applied
    return ranges;
  }

  return (
      <Slate 
        editor={editor}
        initialValue={[{ children: [{ text: '' }] }]}
      >
        <Editable style={{ backgroundColor: "lightgray" }}
          decorate={decorateCode}
          renderElement={({ attributes, element, children }) =>
            <div {...attributes}>{children}</div>
          }
          renderLeaf={({ attributes, children, leaf }) =>
            // here I apply the className that I calculated in "decorateCode"
            <span {...attributes} className={leaf.className}>{children}</span>
          }
        />
      </Slate>
  )
}

export default App;

