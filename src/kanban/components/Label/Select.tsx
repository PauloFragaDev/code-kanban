import * as React from 'react';
import { MdCheck, MdEdit } from 'react-icons/md';
import { styled } from 'styled-components';
import { type Card, type Label, type List } from '../../models/kanban';
import { selectors, kanbanActions } from '../../store';
import { getContrastTextColor } from '../../utils';
import { LabelEdit } from './Edit';

const Modal = styled.div`
  position: absolute;
  right: 0;
  top: 32px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 220px;
  padding: 12px;
  background-color: var(--card-background-color, var(--secondary-background-color));
  border: 1px solid var(--form-border-color);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  z-index: 100;
`;

const SectionTitle = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--secondary-text-color);
  margin-bottom: 2px;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const LabelPill = styled.div<{ $color: string }>`
  flex: 1;
  background-color: ${(p) => p.$color};
  color: ${(p) => getContrastTextColor(p.$color)};
  border-radius: var(--border-radius);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 4px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid transparent;
  transition: border-color 120ms ease-in-out;
  &:hover {
    border-color: var(--primary-color);
  }
`;

const IconButton = styled.button`
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
  transition:
    border-color 120ms ease-in-out,
    color 120ms ease-in-out;
  &:hover {
    border-color: var(--form-border-color);
    color: var(--text-color);
  }
`;

const AddLabelButton = styled.button`
  width: 100%;
  padding: 6px 10px;
  margin-top: 4px;
  background: transparent;
  border: 1px dashed var(--form-border-color);
  border-radius: var(--border-radius);
  color: var(--secondary-text-color);
  font-size: 0.85rem;
  cursor: pointer;
  transition:
    border-color 120ms ease-in-out,
    color 120ms ease-in-out;
  &:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
`;

const EmptyState = styled.div`
  font-size: 0.8rem;
  color: var(--secondary-text-color);
  padding: 4px 0;
`;

type Properties = {
  list: List;
  card: Card;
};

export const LabelSelect = ({ list, card }: Properties) => {
  const kanban = selectors.useKanban();
  const addLabel = kanbanActions.useAddLabel();
  const updateLabel = kanbanActions.useUpdateLabel();
  const updateSettings = kanbanActions.useUpdateSettings();
  const deleteLabel = kanbanActions.useDeleteLabel();
  const [showEditLabel, setShowEditLabel] = React.useState<{label?: Label; show: boolean}>({
    label: undefined,
    show: false,
  });
  const selectedLabelNames = React.useMemo(() => card.labels.map((l) => l.title), [card.labels]);

  const handleCreate = React.useCallback(
    (label: Label) => {
      if (kanban.settings.labels.map((l) => l.title).includes(label.title)) {
        return;
      }

      addLabel(list, card, label);
      updateSettings({labels: [...kanban.settings.labels, label]});
      setShowEditLabel({show: false});
    },
    [kanban.settings.labels, addLabel, list, card, updateSettings]
  );

  const handleEdit = React.useCallback(
    (label: Label) => {
      updateLabel(list, card, label);
      updateSettings({
        labels: kanban.settings.labels.map((l) => (l.id === label.id ? label : l)),
      });
      setShowEditLabel({show: false});
    },
    [kanban.settings.labels, updateLabel, list, card, updateSettings]
  );

  const handleDelete = React.useCallback(
    (label: Label) => {
      deleteLabel(list, card, label.id);
      updateSettings({
        labels: kanban.settings.labels.filter((l) => l.id !== label.id),
      });
      setShowEditLabel({show: false});
    },
    [kanban.settings.labels, deleteLabel, list, card, updateSettings]
  );

  const sortedLabels = React.useMemo(
    () =>
      [...kanban.settings.labels].sort((a, b) => a.title.localeCompare(b.title, undefined, {sensitivity: 'base'})),
    [kanban.settings.labels]
  );

  if (showEditLabel.show) {
    return (
      <LabelEdit
        label={showEditLabel.label}
        onEdit={showEditLabel.label ? handleEdit : handleCreate}
        onDelete={handleDelete}
        onCancel={() => {
          setShowEditLabel({show: false});
        }}
      />
    );
  }

  return (
    <Modal
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
      }}
    >
      <SectionTitle>Labels</SectionTitle>
      {sortedLabels.length === 0 ? (
        <EmptyState>No labels yet. Create one below.</EmptyState>
      ) : (
        sortedLabels.map((l: Label) => (
          <LabelRow key={l.id}>
            <LabelPill
              $color={l.color}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
                const isSelected = selectedLabelNames.includes(l.title);
                if (isSelected) {
                  deleteLabel(list, card, l.id);
                } else {
                  addLabel(list, card, l);
                }
              }}
            >
              <span>{l.title}</span>
              {selectedLabelNames.includes(l.title) && <MdCheck style={{fontSize: '1rem'}} />}
            </LabelPill>
            <IconButton
              type="button"
              aria-label="Edit label"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                setShowEditLabel({show: true, label: l});
              }}
            >
              <MdEdit />
            </IconButton>
          </LabelRow>
        ))
      )}
      <AddLabelButton
        type="button"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          setShowEditLabel({show: true, label: undefined});
        }}
      >
        + Add new label
      </AddLabelButton>
    </Modal>
  );
};
