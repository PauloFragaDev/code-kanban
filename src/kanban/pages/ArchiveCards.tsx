import * as React from 'react';
import { MdDeleteOutline, MdRestore } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { TextBaseBold } from '../components/shared/Text';
import { type Card as CardModel } from '../models/kanban';
import { kanbanActions } from '../store';
import { hexToRgba } from '../utils';

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
  width: 360px;
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
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  background-color: var(--card-background-color, var(--secondary-background-color));
  border: 1px solid var(--form-border-color);
  border-left: 3px solid var(--secondary-text-color);
  border-radius: var(--border-radius);
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.div`
  font-size: 0.9rem;
  color: var(--text-color);
  word-break: break-word;
`;

const Labels = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const LabelPill = styled.span<{ $color: string }>`
  background-color: ${(p) => hexToRgba(p.$color, 0.15)};
  color: ${(p) => p.$color};
  border: 1px solid ${(p) => hexToRgba(p.$color, 0.3)};
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 500;
  padding: 1px 8px;
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
    color 120ms ease-in-out;
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
  cards: CardModel[];
};

export const ArchiveCards = ({cards}: Properties) => {
  const restoreCard = kanbanActions.useRestoreCard();
  const deleteCard = kanbanActions.useDeleteCard();
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
          <TextBaseBold>Archived Cards</TextBaseBold>
        </Header>
        {cards.length === 0 ? (
          <EmptyState>Nothing archived yet.</EmptyState>
        ) : (
          cards.map((c) => (
            <Row key={c.id}>
              <Body>
                <Title>{c.title}</Title>
                {c.labels.length > 0 && (
                  <Labels>
                    {c.labels.map((l) => (
                      <LabelPill key={l.id} $color={l.color}>
                        {l.title}
                      </LabelPill>
                    ))}
                  </Labels>
                )}
              </Body>
              <Actions>
                <ActionButton
                  type="button"
                  $variant="restore"
                  aria-label="Restore card"
                  title="Restore"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    restoreCard(c);
                  }}
                >
                  <MdRestore />
                </ActionButton>
                <ActionButton
                  type="button"
                  $variant="danger"
                  aria-label="Delete card permanently"
                  title="Delete permanently"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    deleteCard(c);
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
