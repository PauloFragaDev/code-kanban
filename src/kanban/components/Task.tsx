import * as React from 'react';
import { IoMdTrash } from 'react-icons/io';
import { styled } from 'styled-components';
import { type CheckBox as CheckBoxModel } from '../models/kanban';
import { CheckBox } from './shared/CheckBox';
import { Title } from './shared/Title';

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 8px;
  border-radius: var(--border-radius);
  transition: background-color 120ms ease-in-out;
  &:hover {
    background-color: var(--hover-color);
  }
`;

const Body = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

const TrashButton = styled.button`
  width: 28px;
  height: 28px;
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

type Props = {
  checkbox: CheckBoxModel;
  onChecked: (checked: boolean) => void;
  onEnter: (title: string) => void;
  onDelete: (checkbox: CheckBoxModel) => void;
};

export const Task = ({checkbox, onChecked, onEnter, onDelete}: Props) => {
  const [showDelete, setShowDelete] = React.useState(false);

  return (
    <Container
      onMouseOver={() => {
        setShowDelete(true);
      }}
      onMouseLeave={() => {
        setShowDelete(false);
      }}
    >
      <Body>
        <CheckBox checked={checkbox.checked} onChange={onChecked} />
        <Title title={checkbox.title} fontSize="small" width="100%" onEnter={onEnter} />
      </Body>
      {showDelete && (
        <TrashButton
          type="button"
          aria-label="Delete task"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            onDelete(checkbox);
          }}
        >
          <IoMdTrash />
        </TrashButton>
      )}
    </Container>
  );
};
