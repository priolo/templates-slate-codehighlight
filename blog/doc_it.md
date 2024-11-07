## PREMESSA
[SLATE](https://docs.slatejs.org/) è un ottima libreria per creare editor WYSIWYG in REACT, lo trovo superiore a [QUILL](https://quilljs.com/).

Ma ho avuto difficoltà a inserire BLOCCHI editabili con highlight per la sintassi del codice.  
Si c'e' un [esempio](https://github.com/ianstormtaylor/slate/blob/main/site/examples/ts/code-highlighting.tsx) ufficiale ma, almeno per me, non è molto chiaro.

## Poche chiacchiere! Vediamo il CODICE!!!

Poniamo che tu abbia un progetto vuoto in React con typescript.  
installa le dipendenze:  
```npm install slate slate-react slate-history prismjs```

in `App.tsx`
```jsx
function App() {

  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  return (
    <Slate
      editor={editor}
      initialValue={[{ children: [{ text: '' }] }]}
    >
      <Editable style={{ backgroundColor: "lightgray" }}
        renderElement={({ attributes, element, children }) =>
          <div {...attributes}>{children}</div>
        }
        renderLeaf={({ attributes, children, leaf }) =>
          <span {...attributes}>{children}</span>
        }
      />
    </Slate>
  )
}
```
Su inizializzazione del componente "App"  
creo il cotroller [editor](https://docs.slatejs.org/api/nodes/editor)  
e lo applico al componente [Slate](https://docs.slatejs.org/libraries/slate-react/slate).

## Creiamo i token per il highlight con [PRISMJS](https://prismjs.com/)

in `App.tsx`
```typescript
... 

type BaseRangeCustom = BaseRange & { className: string }

function decorateCode([node, path]: NodeEntry) {
	const ranges: BaseRangeCustom[] = []

	// make sure it is an Slate Element
	if (!Element.isElement(node)) return ranges
	// transform the Element into a string 
	const text = Node.string(node)

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

	// these will be found in "renderLeaf" in "leaf" and their "className" will be applied
	return ranges;
}
```

Questa funzione riceve un [Node](https://docs.slatejs.org/api/nodes/node) SLATE.  
Ricavo il testo del "Node"  
Con il testo creo i "tokens" con [PRISMJS](https://prismjs.com/).  
Trasformo i "tokens" in [Range](https://docs.slatejs.org/api/locations/range).  
I "Ranges" hanno la proprietà `className` con le informazioni per il highlight.  

In fine applico i "Ranges" al componente Slate  
Assegno la funzione alla proprietà `decorate` che è renderizzata con `renderLeaf`  

sempre in `App.tsx`
```jsx
...
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
...
```
Il codice è [qui](https://codesandbox.io/p/sandbox/slate-block-code-xghypm)!  
Fine.

## Ottimizzare il codice

Noterai che la funzione "decorateCode" è chiamata con qualsiasi interazione.  
Ogni volta che premi un tasto crea i token per tutte le righe!  
Per ottimizzare usiamo una cache.

Spostiamo la funzione "decorateCode" dentro il componente "App"
```jsx
function App() {
	...

	const cacheMem = useRef<{ text: string, ranges: BaseRange[] }[]>([])

	function decorateCode([node, path]: NodeEntry) {

		// CACHE **************
		const ranges: BaseRangeCustom[] = []

		// make sure it is an Slate Element
		if (!Element.isElement(node)) return ranges
		// transform the Element into a string 
		const text = Node.string(node)

		// CACHE **************
		const index = path[0]
		const cache = cacheMem.current[index]
		if (!!cache && cache.text == text) return cache.ranges
		// CACHE **************

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

		// CACHE **************
		cacheMem.current[index] = { text, ranges }
		// CACHE **************

		// these will be found in "renderLeaf" in "leaf" and their "className" will be applied
		return ranges;
	}
}

```
Trovi il codice [qui](https://codesandbox.io/p/sandbox/slate-block-code-forked-vw98y6?workspaceId=78ba401d-4766-44f8-8819-01f56e6e6a1a)!

In pratica se la [Path](https://docs.slatejs.org/api/locations/path) del Node (che è un indice)  
è presente in cache e il testo è lo stesso  
ritorna subito i "ranges" dalla cache senza creare i "tokens". 

