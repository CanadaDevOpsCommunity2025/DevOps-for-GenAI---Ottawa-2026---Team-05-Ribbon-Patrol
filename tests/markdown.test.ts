import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MarkdownRenderer } from '../src/components/MarkdownRenderer';

describe('MarkdownRenderer component', () => {
  it('should render bold text, inline code, and lists', () => {
    const markdown = '**Important note:** run `git stash pop`\n\n* Step 1\n* Step 2';
    const html = renderToString(React.createElement(MarkdownRenderer, { content: markdown, isUser: false }));

    expect(html).toContain('Important note:');
    expect(html).toContain('git stash pop');
    expect(html).toContain('Step 1');
    expect(html).toContain('Step 2');
    expect(html).toContain('<strong');
    expect(html).toContain('<code');
    expect(html).toContain('<ul');
  });

  it('should render fenced code blocks with copy action structure', () => {
    const markdown = '```bash\ngit checkout -b feature/login\n```';
    const html = renderToString(React.createElement(MarkdownRenderer, { content: markdown, isUser: false }));

    expect(html).toContain('git checkout -b feature/login');
    expect(html).toContain('bash');
  });

  it('should render tables correctly using remark-gfm', () => {
    const markdown = '| Branch | Ahead | Behind |\n| --- | --- | --- |\n| main | 0 | 2 |';
    const html = renderToString(React.createElement(MarkdownRenderer, { content: markdown, isUser: false }));

    expect(html).toContain('<table');
    expect(html).toContain('Branch');
    expect(html).toContain('Ahead');
    expect(html).toContain('Behind');
    expect(html).toContain('main');
  });
});
