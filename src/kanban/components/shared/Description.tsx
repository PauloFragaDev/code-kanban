import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import TextareaAutosize from 'react-textarea-autosize';
import { styled } from 'styled-components';

const Container = styled.div`
  width: 100%;
  margin-top: 4px;
`;

const RenderedView = styled.div`
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid var(--form-border-color);
  border-radius: var(--border-radius);
  background-color: var(--card-background-color, var(--secondary-background-color));
  color: var(--text-color);
  cursor: text;
  transition: border-color 120ms ease-in-out;
  &:hover {
    border-color: var(--primary-color);
  }
`;

type Props = {
  description: string;
  fontSize: 'medium' | 'large';
  onEnter: (text: string) => void;
};

export const Description = ({description: defaultDescription, fontSize, onEnter}: Props) => {
  const [isEdit, setEdit] = React.useState(false);
  const [description, setDescription] = React.useState(defaultDescription);

  const handleBlur = React.useCallback(() => {
    onEnter(description);
    setEdit(false);
  }, [description, onEnter]);

  React.useEffect(() => {
    setDescription(defaultDescription);
  }, [defaultDescription]);

  // Empty OR currently editing → show the textarea (placeholder visible when empty).
  // Has content AND not editing → show the rendered markdown; click switches to edit.
  const showEditor = isEdit || description.length === 0;

  if (showEditor) {
    return (
      <Container>
        <TextareaAutosize
          autoFocus={isEdit}
          placeholder="Enter description"
          minRows={1}
          maxRows={20}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setDescription(e.target.value);
          }}
          onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
            setEdit(true);
            e.currentTarget.style.borderColor = 'var(--primary-color)';
          }}
          onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
            e.currentTarget.style.borderColor = 'var(--form-border-color)';
            handleBlur();
          }}
          style={{
            width: '100%',
            minHeight: '40px',
            fontFamily: 'var(--font-family)',
            backgroundColor: 'var(--card-background-color, var(--secondary-background-color))',
            color: 'var(--text-color)',
            fontSize: fontSize === 'medium' ? '1rem' : '1.5rem',
            lineHeight: '1.5rem',
            padding: '8px 12px',
            resize: 'none',
            border: '1px solid var(--form-border-color)',
            borderRadius: 'var(--border-radius)',
            outline: 'none',
            transition: 'border-color 120ms ease-in-out',
            boxSizing: 'border-box',
          }}
          value={description}
        />
      </Container>
    );
  }

  return (
    <Container>
      <RenderedView
        style={{
          fontSize: fontSize === 'medium' ? '1rem' : '1.5rem',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setEdit(true);
        }}
      >
        <ReactMarkdown>{description}</ReactMarkdown>
      </RenderedView>
    </Container>
  );
};
