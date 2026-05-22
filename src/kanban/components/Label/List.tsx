import * as React from 'react';
import { MdAdd } from 'react-icons/md';
import { styled } from 'styled-components';
import { type Card, type List } from '../../models/kanban';
import { selectors, actions } from '../../store';
import { hexToRgba } from '../../utils';
import { LabelSelect } from './Select';

const Labels = styled.div`
  display: flex;
  gap: 4px;
  position: relative;
`;

const LabelItem = styled.div`
  font-size: 0.875rem;
  line-height: 1.5rem;
  border-radius: var(--border-radius);
  margin-right: 4px;
  font-weight: 500;
  padding: 1px 10px;
  height: 24px;
  border: 1px solid transparent;
`;

const AddButton = styled.div`
  padding: 2px 10px;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--border-radius);
  border: 1px dashed var(--form-border-color);
  background-color: transparent;
  color: var(--secondary-text-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  height: 24px;
  transition:
    border-color 120ms ease-in-out,
    color 120ms ease-in-out;
  &:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
`;

type Properties = {
  list: List;
  card: Card;
};

export const LabelList = ({ list, card }: Properties) => {
  const showModal = selectors.useShowModal();
  const setShowModal = actions.useSetShowModal();
  const sortedLabels = React.useMemo(
    () => [...card.labels].sort((a, b) => a.title.localeCompare(b.title)),
    [card.labels]
  );

  return (
    <Labels>
      {sortedLabels.map((l) => (
        <LabelItem
          key={l.id}
          style={{
            backgroundColor: hexToRgba(l.color, 0.15),
            color: l.color,
            borderColor: hexToRgba(l.color, 0.3),
            cursor: 'pointer',
          }}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            e.stopPropagation();
            setShowModal(true);
          }}
        >
          {l.title}
        </LabelItem>
      ))}
      <AddButton
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          e.stopPropagation();
          setShowModal(true);
        }}
      >
        <MdAdd />
        <span>Add label</span>
      </AddButton>
      {showModal && <LabelSelect list={list} card={card} />}
    </Labels>
  );
};
