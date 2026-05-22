import * as React from 'react';
import { styled } from 'styled-components';

const Button = styled.div<{ $active: boolean }>`
  cursor: pointer;
  font-size: 1.1rem;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius);
  border: 1px solid ${(p) => (p.$active ? 'var(--primary-color)' : 'transparent')};
  color: ${(p) => (p.$active ? 'var(--primary-color)' : 'inherit')};
  background-color: ${(p) => (p.$active ? 'var(--hover-color)' : 'transparent')};
  transition:
    border-color 120ms ease-in-out,
    color 120ms ease-in-out,
    background-color 120ms ease-in-out;
  &:hover {
    border-color: ${(p) => (p.$active ? 'var(--primary-color)' : 'var(--form-border-color)')};
    color: ${(p) => (p.$active ? 'var(--primary-color)' : 'inherit')};
  }
`;

type Props = {
  icon: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
};

export const IconButton = ({icon, onClick, title, active = false}: Props) => {
  return (
    <Button
      $active={active}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
    >
      {icon}
    </Button>
  );
};
