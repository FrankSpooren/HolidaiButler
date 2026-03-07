import { Box, Typography, ToggleButton, ToggleButtonGroup, Divider } from '@mui/material';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import LinkIcon from '@mui/icons-material/Link';
import ImageIcon from '@mui/icons-material/Image';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import { useEffect, useRef } from 'react';

function MenuBar({ editor }) {
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('URL:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('Image URL:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, p: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
      <ToggleButtonGroup size="small" sx={{ '& .MuiToggleButton-root': { border: 0, px: 0.75 } }}>
        <ToggleButton value="bold" selected={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <FormatBoldIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton value="italic" selected={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <FormatItalicIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton value="underline" selected={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <FormatUnderlinedIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <ToggleButtonGroup size="small" sx={{ '& .MuiToggleButton-root': { border: 0, px: 0.75 } }}>
        <ToggleButton value="h2" selected={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </ToggleButton>
        <ToggleButton value="h3" selected={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </ToggleButton>
        <ToggleButton value="h4" selected={editor.isActive('heading', { level: 4 })} onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}>
          H4
        </ToggleButton>
      </ToggleButtonGroup>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <ToggleButtonGroup size="small" sx={{ '& .MuiToggleButton-root': { border: 0, px: 0.75 } }}>
        <ToggleButton value="bulletList" selected={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <FormatListBulletedIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton value="orderedList" selected={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <FormatListNumberedIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <ToggleButtonGroup size="small" sx={{ '& .MuiToggleButton-root': { border: 0, px: 0.75 } }}>
        <ToggleButton value="left" selected={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <FormatAlignLeftIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton value="center" selected={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <FormatAlignCenterIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton value="right" selected={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <FormatAlignRightIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <ToggleButtonGroup size="small" sx={{ '& .MuiToggleButton-root': { border: 0, px: 0.75 } }}>
        <ToggleButton value="link" onClick={addLink}>
          <LinkIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton value="image" onClick={addImage}>
          <ImageIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

export default function RichTextField({ label, value, onChange, helperText, disabled, placeholder: placeholderText, sx }) {
  const skipUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false }),
      ImageExt,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Placeholder.configure({ placeholder: placeholderText || 'Start typing...' })
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      skipUpdate.current = true;
      onChange(ed.getHTML());
    }
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && !skipUpdate.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
    skipUpdate.current = false;
  }, [value, editor]);

  return (
    <Box sx={{ mb: 2, ...sx }}>
      {label && <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>{label}</Typography>}
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', '& .ProseMirror': { p: 1.5, minHeight: 150, outline: 'none', '& p': { m: 0, mb: 0.5 }, '& h2,h3,h4': { mt: 1, mb: 0.5 } } }}>
        <MenuBar editor={editor} />
        <EditorContent editor={editor} />
      </Box>
      {helperText && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{helperText}</Typography>}
    </Box>
  );
}
