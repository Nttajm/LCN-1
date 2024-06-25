document.addEventListener("DOMContentLoaded", function() {
    const editor = document.getElementById("editor");

    // Load the saved text from localStorage
    const savedText = localStorage.getItem("editorText");
    if (savedText) {
        editor.innerHTML = highlightSyntax(savedText);
    }

    editor.addEventListener("input", function() {
        const caretPosition = getCaretPosition(editor);
        const code = editor.innerText; // Changed to innerText to handle new lines
        const highlightedCode = highlightSyntax(code);
        editor.innerHTML = highlightedCode;
        setCaretPosition(editor, caretPosition);

        // Save the text to localStorage
        localStorage.setItem("editorText", code);
    });

    editor.addEventListener("keydown", function(event) {
        if (event.key === "Tab") {
            event.preventDefault();
            insertTab();
        }
        if (event.key === "Enter") {
            event.preventDefault();
            insertNewLine();
        }
    });

    function highlightSyntax(code) {
        const keywords = ['co', 'val', 'call', 'const', 'if', 'eli', 'el'];
        const dents = ['=>', '::', 'Elive', '?', 'It', 'as', '..', 'Range'];
        const funs = ['then', 'finally', 'get', 'replace', 'capL', '.some', 'last', 'push', 'await', 'sys.out', 'console', 'out', 'in', 'source', 'parse', 'content', 'sync', 'For', 'includes', 'Mt', 'inverse', 'split', 'try'];
        const cores = ['fetch', 'affrim', 'imp', 'from', 'VarPOST', 'VarGET'];
        const local = ['JSONp', 'JSliveRec', 'seq'];
        const orange = ['url', 'in', 'with', 'guide', 'csv'];

        const keywordRegex = eml(keywords);
        const funsRegex = eml(funs);
        const coresRegex = eml(cores);
        const localRegex = eml(local);
        const dentsReg = eml(dents);
        const orangeReg = eml(orange);

        const strings = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
        const arrowFunctionRegex = /=>/g;
        const lolineedgts = /::/g;
        const parensRegex = /[()]/g;
        const bracketsRegex = /(\[|\])/g;

        return code
            .replace(strings, '<span class="string">$&</span>')
            .replace(keywordRegex, hq('keyword'))
            .replace(funsRegex, hq('funs'))
            .replace(coresRegex, hq('cores'))
            .replace(localRegex, hq('local'))
            .replace(dentsReg, hq('dents'))
            .replace(orangeReg, hq('orange'))
            .replace(arrowFunctionRegex, '<span class="dents">$&</span>')
            .replace(lolineedgts, '<span class="dents">$&</span>')
            .replace(parensRegex, '<span class="local">$&</span>')
            .replace(bracketsRegex, '<span class="brackets">$&</span>');
    }

    function eml(words) {
        return new RegExp('\\b(' + words.map(escapeRegExp).join('|') + ')\\b', 'g');
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function hq(className) {
        return function(match) {
            return `<span class="${className}">${match}</span>`;
        }
    }

    function getCaretPosition(el) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return 0;
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(el);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        return preCaretRange.toString().length;
    }

    function setCaretPosition(el, position) {
        const range = document.createRange();
        const selection = window.getSelection();
        let charCount = 0, nodeStack = [el], node, foundStart = false;

        while ((node = nodeStack.pop())) {
            if (node.nodeType === 3) {
                const nextCharCount = charCount + node.length;
                if (!foundStart && position <= nextCharCount) {
                    range.setStart(node, position - charCount);
                    range.collapse(true);
                    foundStart = true;
                }
                charCount = nextCharCount;
            } else {
                let i = node.childNodes.length;
                while (i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }

        selection.removeAllRanges();
        selection.addRange(range);
    }

    function insertTab() {
        const sel = window.getSelection();
        const range = sel.getRangeAt(0);

        const tabNode = document.createTextNode("\t");
        range.insertNode(tabNode);

        range.setStartAfter(tabNode);
        range.setEndAfter(tabNode);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    function insertNewLine() {
        const sel = window.getSelection();
        const range = sel.getRangeAt(0);

        const brNode = document.createElement("br");
        range.deleteContents();
        range.insertNode(brNode);
        range.setStartAfter(brNode);
        range.setEndAfter(brNode);
        sel.removeAllRanges();
        sel.removeAllRanges();
        sel.addRange(range);
    }
});