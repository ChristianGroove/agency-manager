const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/crm/reports/page.tsx', 'utf-8');

let lineNum = 1;
let colNum = 1;
const stack = [];

// Extremely naive parser to find the unclosed tag
for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
        lineNum++;
        colNum = 1;
        continue;
    }
    
    // Look for <tag or </tag
    if (content[i] === '<' && /[a-zA-Z]/.test(content[i+1])) {
        let tag = '';
        let j = i + 1;
        while (j < content.length && /[a-zA-Z0-9-]/.test(content[j])) {
            tag += content[j];
            j++;
        }
        
        // check if self closing
        let isSelfClosing = false;
        let k = j;
        while (k < content.length && content[k] !== '>') {
            if (content[k] === '/' && content[k+1] === '>') {
                isSelfClosing = true;
                break;
            }
            k++;
        }
        
        if (!isSelfClosing) {
            stack.push({tag, line: lineNum});
        }
    } else if (content[i] === '<' && content[i+1] === '/') {
        let tag = '';
        let j = i + 2;
        while (j < content.length && /[a-zA-Z0-9-]/.test(content[j])) {
            tag += content[j];
            j++;
        }
        
        if (stack.length > 0) {
            const last = stack.pop();
            if (last.tag !== tag) {
                console.log(`Mismatch at line ${lineNum}: Expected </${last.tag}> (opened at ${last.line}) but found </${tag}>`);
                break;
            }
        }
    }
}

if (stack.length > 0) {
    console.log("Unclosed tags remaining:");
    stack.forEach(s => console.log(`<${s.tag}> opened at line ${s.line}`));
} else {
    console.log("No unclosed tags found by simple parser.");
}
