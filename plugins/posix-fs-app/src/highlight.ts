import type { HighlightResolver } from 'treevim';

export const highlightResolver: HighlightResolver = (token: string) => {
  switch (token) {
    case 'node.content.icon.typescript':
      return { fg: { hex: '#3178c6' } };

    case 'node.content.icon.javascript':
      return { fg: { hex: '#f1dd35' } };

    case 'node.content.icon.json':
      return { fg: { hex: '#ae8be6' } };

    case 'node.content.icon.git-logo':
      return { fg: { hex: '#dd4d3a' } };

    case 'node.content.icon.svg':
      return { fg: { hex: '#ebad51' } };

    case 'node.content.icon.yaml':
      return { fg: { hex: '#b42f28' } };

    case 'node.content.icon.xml':
      return { fg: { hex: '#275ca7' } };

    case 'node.content.icon.zshell':
      return { fg: { hex: '#df6437' } };

    case 'node.content.icon.folder':
      return { fg: { hex: '#7ecdfa' } };

    case 'node.content.icon.prettier':
      return { fg: { hex: '#56B3B4' } };
  }
  
  // TODO: Add Lua

  return undefined;
};
