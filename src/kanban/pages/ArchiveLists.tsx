import * as React from 'react';
import { MdDeleteOutline, MdRestore } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { TextBaseBold } from '../components/shared/Text';
import { type List } from '../models/kanban';
import { kanbanActions } from '../store';

const Overlay = styled.div`
  width: 100%;
  height: 100vh;
  position: absolute;
  display: flex;
  flex-direction: column;
  background-color: rgba(0, 0, 0, 0.1);
  top: 0;
`;

const ArchiveMenu = styled.div`
  position: absolute;
  right: 0;
  top: var(--header-height);
  color: var(--text-color);
  background-color: var(--primary-background-color);
  width: 320px;
  height: calc(100vh - var(--header-height));
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Header = styled.div`
  width: 100%;
  padding: 4px 8px 12px 8px;
  text-align: center;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background-color: var(--card-background-color, var(--secondary-background-color));
  border: 1px solid var(--form-border-color);
  border-left: 3px solid var(--secondary-text-color);
  border-radius: var(--border-radius);
`;

const Title = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 0.9rem;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;

const ActionButton = styled.button<{ $variant: 'restore' | 'danger' }>`
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--form-border-color);
  border-radius: var(--border-radius);
  color: var(--secondary-text-color);
  cursor: pointer;
  transition:
    border-color 120ms ease-in-out,
    color 120ms ease-in-out,
    background-color 120ms ease-in-out;
  &:hover {
    border-color: ${(p) => (p.$variant === 'danger' ? 'var(--danger-color)' : 'var(--primary-color)')};
    color: ${(p) => (p.$variant === 'danger' ? 'var(--danger-color)' : 'var(--primary-color)')};
  }
`;

const EmptyState = styled.div`
  padding: 24px 8px;
  text-align: center;
  color: var(--secondary-text-color);
  font-size: 0.9rem;
`;

type Properties = {
  lists: Array<Pick<List, 'title' | 'id'>>;
};

export const ArchiveLists = ({lists}: Properties) => {
  const restoreList = kanbanActions.useRestoreList();
  const removeList = kanbanActions.useRemoveList();
  const navigate = useNavigate();

  return (
    <Overlay
      onClick={() => {
        navigate('/');
      }}
    >
      <ArchiveMenu
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          e.stopPropagation();
        }}
      >
        <Header>
          <TextBaseBold>Archived Lists</TextBaseBold>
        </Header>
        {lists.length === 0 ? (
          <EmptyState>Nothing archived yet.</EmptyState>
        ) : (
          lists.map((l) => (
            <Row key={l.id}>
              <Title>{l.title}</Title>
              <Actions>
                <ActionButton
                  type="button"
                  $variant="restore"
                  aria-label="Restore list"
                  title="Restore"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    restoreList({...l, cards: []});
                  }}
                >
                  <MdRestore />
                </ActionButton>
                <ActionButton
                  type="button"
                  $variant="danger"
                  aria-label="Delete list permanently"
                  title="Delete permanently"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    removeList(l.id);
                  }}
                >
                  <MdDeleteOutline />
                </ActionButton>
              </Actions>
            </Row>
          ))
        )}
      </ArchiveMenu>
    </Overlay>
  );
};
