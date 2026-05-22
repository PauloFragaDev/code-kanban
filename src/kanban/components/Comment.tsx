import * as React from 'react';
import { IoMdTrash } from 'react-icons/io';
import ReactMarkdown from 'react-markdown';
import TextareaAutosize from 'react-textarea-autosize';
import { styled } from 'styled-components';
import { type Comment as CommentModel } from '../models/kanban';

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--border-radius);
  transition: background-color 120ms ease-in-out;
  &:hover {
    background-color: var(--hover-color);
  }
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  line-height: 1.4rem;
  color: var(--text-color);
  word-break: break-word;
  cursor: text;
  p {
    margin: 0;
  }
`;

const TrashButton = styled.button`
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--border-radius);
  color: var(--secondary-text-color);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    border-color 120ms ease-in-out,
    color 120ms ease-in-out;
  &:hover {
    border-color: var(--danger-color);
    color: var(--danger-color);
  }
`;

type Properties = {
  comment: CommentModel;
  onEnter: (text: string) => void;
  onDelete: (comment: CommentModel) => void;
};

export const Comment = ({comment, onEnter, onDelete}: Properties) => {
  const [isEdit, setEdit] = React.useState(false);
  const [text, setText] = React.useState(comment.comment ?? '');
  const [showTrash, setShowTrash] = React.useState(false);

  React.useEffect(() => {
    setText(comment.comment ?? '');
  }, [comment.comment]);

  const commit = React.useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length > 0 && trimmed !== (comment.comment ?? '')) {
      onEnter(trimmed);
    }

    setEdit(false);
  }, [text, comment.comment, onEnter]);

  return (
    <Row
      onMouseOver={() => {
        setShowTrash(true);
      }}
      onMouseLeave={() => {
        setShowTrash(false);
      }}
    >
      <Body
        onClick={() => {
          if (!isEdit) setEdit(true);
        }}
      >
        {isEdit ? (
          <TextareaAutosize
            autoFocus
            minRows={1}
            maxRows={10}
            value={text}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setText(e.target.value);
            }}
            onBlur={commit}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commit();
                e.currentTarget.blur();
              }

              if (e.key === 'Escape') {
                setText(comment.comment ?? '');
                setEdit(false);
              }
            }}
            style={{
              width: '100%',
              fontFamily: 'var(--font-family)',
              fontSize: '0.875rem',
              lineHeight: '1.4rem',
              color: 'var(--text-color)',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: 0,
            }}
          />
        ) : (
          <ReactMarkdown>{comment.comment ?? ''}</ReactMarkdown>
        )}
      </Body>
      {showTrash && !isEdit && (
        <TrashButton
          type="button"
          aria-label="Delete comment"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onDelete(comment);
          }}
        >
          <IoMdTrash />
        </TrashButton>
      )}
    </Row>
  );
};
