document.addEventListener("DOMContentLoaded", function() {
    const editor = document.getElementById("editor");

    // Load the saved text from localStorage
    const savedText = localStorage.getItem("editorText");
    if (savedText) {
        editor.innerText = savedText;
    }

    editor.addEventListener("input", function() {
        const code = editor.innerText;
        const highlightedCode = highlightSyntax(code);
        editor.innerHTML = highlightedCode;
        placeCaretAtEnd(editor);

        // Save the text to localStorage
        localStorage.setItem("editorText", code);
    });

    editor.addEventListener("keydown", function(event) {
        if (event.key === "Tab") {
            event.preventDefault();
            const cursorPos = editor.selectionStart;
            const textBeforeCursor = editor.innerText.substring(0, cursorPos);
            const textAfterCursor = editor.innerText.substring(cursorPos);
            const indentedText = textBeforeCursor + "\t" + textAfterCursor;
            editor.innerText = indentedText;
            editor.selectionStart = editor.selectionEnd = cursorPos + 1; // Move cursor after the inserted tab
        }
    });

    function highlightSyntax(code) {
        const keywords = ['co', 'val', 'call', 'const'];
        const dents = ['=>', '::', 'Elive', '?', 'It'];
        const funs = ['then', 'finally', 'get', 'replace', 'capL', '.some', 'last', 'push', 'await', 'sys.out','console', 'out', 'in', 'source', 'parse', 'content', 'sync', 'For', 'includes', 'Mt', 'inverse', 'split', 'try'];
        const cores = ['fetch', 'affrim ', 'imp', 'from', 'VarPOST', 'VarGET'];
        const local = ['JSONp', 'JSliveRec', 'seq']
        const orange = ['url', 'in', 'with', 'guide']

        const keywordRegex = eml(keywords);
        const funsRegex = eml(funs);
        const coresRegex = eml(cores);
        const localRegex = eml(local);
        const dentsReg = eml(dents)
        const orangeReg = eml(orange)

        const strings = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
        const arrowFunctionRegex = /=>/g; // Regular expression for '=>'
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
        .replace(arrowFunctionRegex, '<span class="dents">$&</span>') // Replace '=>' with highlighted version
        .replace(lolineedgts, '<span class="dents">$&</span>')
        .replace(parensRegex, '<span class="local">$&</span>')
        .replace(bracketsRegex, '<span class="brackets">$&</span>'); // Replace '[]' with highlighted version

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

    function placeCaretAtEnd(el) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
});
