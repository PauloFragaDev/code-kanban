import * as React from 'react';
import { MdCheck } from 'react-icons/md';
import { styled } from 'styled-components';
import { type Color, colors, type Label } from '../../models/kanban';
import { uuid } from '../../utils';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';

const Modal = styled.div`
  position: absolute;
  right: 0;
  top: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 240px;
  padding: 14px;
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
  margin-bottom: 4px;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Swatches = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
`;

const Swatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: var(--border-radius);
  background-color: ${(p) => p.$color};
  border: 2px solid ${(p) => (p.$selected ? 'var(--text-color)' : 'transparent')};
  cursor: pointer;
  padding: 0;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: transform 80ms ease-in-out;
  &:hover {
    transform: scale(1.08);
  }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--form-border-color);
`;

type Props = {
  label?: Label;
  onEdit: (label: Label) => void;
  onDelete?: (label: Label) => void;
  onCancel?: () => void;
};

export const LabelEdit = ({label, onEdit, onDelete, onCancel}: Props) => {
  const [selectedColor, setSelectedColor] = React.useState(label ? label.color : ('#ff9f1a' as Color));
  const [labelText, setLabelText] = React.useState(label ? label.title : '');

  return (
    <Modal
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
      }}
    >
      <SectionTitle>{label ? 'Edit label' : 'New label'}</SectionTitle>
      <Field>
        <Input
          autoFocus
          placeholder="Label name"
          value={labelText}
          style={{width: '100%', boxSizing: 'border-box'}}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setLabelText(e.target.value);
          }}
        />
      </Field>
      <Field>
        <SectionTitle>Color</SectionTitle>
        <Swatches>
          {colors.map((c) => (
            <Swatch
              key={c}
              type="button"
              $color={c}
              $selected={c === selectedColor}
              aria-label={c}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                setSelectedColor(c);
              }}
            >
              {c === selectedColor && <MdCheck />}
            </Swatch>
          ))}
        </Swatches>
      </Field>
      <Footer>
        {label && onDelete && (
          <Button
            type="danger"
            text="Delete"
            disabled={false}
            onClick={() => {
              onDelete(label);
            }}
          />
        )}
        {onCancel && (
          <Button
            text="Cancel"
            type="secondary"
            disabled={false}
            onClick={onCancel}
          />
        )}
        <Button
          text={label ? 'Save' : 'Create'}
          type="primary"
          disabled={labelText.trim().length === 0}
          onClick={() => {
            onEdit(
              label
                ? {...label, title: labelText.trim(), color: selectedColor}
                : {
                    id: uuid(),
                    title: labelText.trim(),
                    color: selectedColor,
                  }
            );
          }}
        />
      </Footer>
    </Modal>
  );
};
