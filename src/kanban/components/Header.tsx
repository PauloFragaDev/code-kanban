import * as React from 'react';
import { MdArchive, MdFilterAlt, MdMenu, MdSearch, MdRefresh } from 'react-icons/md';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from 'styled-components';
import LogoImage from '../assets/icon.svg';
import { actions, selectors } from '../store';
import { vscode } from '../../vscode';
import { IconButton } from './shared/IconButton';
import { Input } from './shared/Input';
import { Menu } from './shared/Menu';
import { TextXs } from './shared/Text';

type Props = {
  title: string;
};

const Container = styled.div`
  width: 100vw;
  height: var(--header-height);
  display: flex;
  align-items: center;
  background-color: var(--header-color);
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
`;

const Search = styled.div`
  position: relative;
  width: calc(100% - 120px);
  display: flex;
  align-items: center;
  background-color: var(--card-background-color, var(--secondary-background-color));
  border: 1px solid var(--form-border-color);
  border-radius: var(--border-radius);
  margin-left: 16px;
  padding: 0 8px;
  transition: border-color 120ms ease-in-out;
  &:focus-within {
    border-color: var(--primary-color);
  }
`;

const Icon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: var(--secondary-text-color);
  margin-right: 6px;
  flex-shrink: 0;
`;

const Title = styled.div`
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--secondary-color);
  text-align: center;
`;

const Logo = styled.div`
  width: 32px;
  height: 32px;
  margin: 8px;
  object-fit: contain;
  padding-top: 8px;
`;

export const Header = ({ title }: Props) => {
  const setFilter = actions.useSetFilter();
  const searchLabels = selectors.useFilterLabels();
  const menuClose = actions.useMenuClose();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchInput, setSearchInput] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFilter(searchInput, searchLabels);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchInput]);

  return (
    <Container>
      <LogoContainer>
        <Logo>
          <LogoImage />
        </Logo>
        <Title>{title}</Title>
      </LogoContainer>
      <Search>
        <Icon>
          <MdSearch />
        </Icon>
        <Input
          style={{
            flex: 1,
            color: 'var(--text-color)',
            backgroundColor: 'transparent',
            border: 'none',
            padding: '6px 4px',
          }}
          value={searchInput}
          autoComplete="off"
          placeholder="Filter cards"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchInput(e.target.value);
          }}
        />
      </Search>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          gap: '8px',
        }}
      >
        <IconButton
          icon={<MdRefresh />}
          onClick={() => {
            menuClose();
            vscode.postMessage({ type: 'reload' });
          }}
          title="Reload kanban file"
        />
        <IconButton
          icon={<MdFilterAlt />}
          active={location.pathname === '/filters' || (searchLabels.size ?? 0) > 0}
          onClick={() => {
            menuClose();
            navigate('/filters', { state: { backgroundLocation: location } });
          }}
        />
        {(searchLabels.size ?? 0) > 0 && <TextXs style={{ marginBottom: '4px' }}>{searchLabels.size}</TextXs>}
      </div>
      <div style={{ padding: '2px', paddingRight: '16px' }}>
        <Menu
          id={`main-menu`}
          position="left"
          icon={<MdMenu />}
          items={[
            {
              icon: <MdArchive />,
              text: 'Archived List',
              onClick() {
                navigate('/archive/lists', {
                  state: { backgroundLocation: location },
                });
              },
            },
            {
              icon: <MdArchive />,
              text: 'Archived cards',
              onClick() {
                navigate('/archive/cards', {
                  state: { backgroundLocation: location },
                });
              },
            },
          ]}
        />
      </div>
    </Container>
  );
};
