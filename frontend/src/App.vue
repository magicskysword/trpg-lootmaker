<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-dialog-provider>
      <n-notification-provider>
        <n-message-provider>
          <router-view />
        </n-message-provider>
      </n-notification-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<script setup>
import { darkTheme } from 'naive-ui';
import {
  NConfigProvider,
  NDialogProvider,
  NNotificationProvider,
  NMessageProvider
} from 'naive-ui';

const themeOverrides = {
  common: {
    primaryColor: '#c9a84c',
    primaryColorHover: '#f1d55c',
    primaryColorPressed: '#8a7430',
    primaryColorSuppl: '#c9a84c',
    infoColor: '#6e5cc7',
    infoColorHover: '#9b8ce8',
    successColor: '#27ae60',
    warningColor: '#e67e22',
    errorColor: '#c0392b',
    bodyColor: '#131627',
    cardColor: '#1e2240',
    modalColor: '#1e2240',
    popoverColor: '#262b4d',
    tableColor: '#1e2240',
    inputColor: '#161a30',
    actionColor: '#1a1e35',
    borderColor: 'rgba(201, 168, 76, 0.2)',
    dividerColor: 'rgba(201, 168, 76, 0.15)',
    hoverColor: 'rgba(201, 168, 76, 0.08)',
    textColorBase: '#e8dcc8',
    textColor1: '#e8dcc8',
    textColor2: '#c4b6a0',
    textColor3: '#8e8270',
    fontFamily: "'LXGW WenKai', 'Noto Serif SC', serif",
    borderRadius: '10px',
    borderRadiusSmall: '6px',
    boxShadow1: '0 4px 16px rgba(0,0,0,0.35)',
    boxShadow2: '0 8px 32px rgba(0,0,0,0.4)',
  },
  Card: {
    color: '#1e2240',
    borderColor: 'rgba(201, 168, 76, 0.2)',
    titleTextColor: '#c9a84c',
    titleFontWeight: '600',
    borderRadius: '16px',
  },
  Button: {
    colorPrimary: '#c9a84c',
    colorHoverPrimary: '#f1d55c',
    colorPressedPrimary: '#8a7430',
    textColorPrimary: '#0d0f1a',
    textColorHoverPrimary: '#0d0f1a',
    textColorPressedPrimary: '#0d0f1a',
    borderRadius: '10px',
  },
  Input: {
    color: '#161a30',
    borderColor: 'rgba(201, 168, 76, 0.2)',
    borderHover: 'rgba(201, 168, 76, 0.5)',
    borderFocus: '#c9a84c',
    textColor: '#e8dcc8',
    placeholderColor: '#6b6358',
    caretColor: '#c9a84c',
  },
  Select: {
    peers: {
      InternalSelection: {
        color: '#161a30',
        borderColor: 'rgba(201, 168, 76, 0.2)',
        borderHover: 'rgba(201, 168, 76, 0.5)',
        borderFocus: '#c9a84c',
        textColor: '#e8dcc8',
        placeholderColor: '#6b6358',
      }
    }
  },
  Tabs: {
    tabTextColorLine: '#8e8270',
    tabTextColorActiveLine: '#c9a84c',
    tabTextColorHoverLine: '#f1d55c',
    barColor: '#c9a84c',
    tabBorderColor: 'rgba(201, 168, 76, 0.15)',
  },
  Tag: {
    borderRadius: '20px',
  },
  Table: {
    thColor: '#1a1e35',
    tdColor: 'transparent',
    thTextColor: '#c9a84c',
    tdTextColor: '#e8dcc8',
    borderColor: 'rgba(201, 168, 76, 0.12)',
    thColorModal: '#1a1e35',
    tdColorModal: 'transparent',
    tdColorStriped: 'rgba(201, 168, 76, 0.03)',
    tdColorStripedModal: 'rgba(201, 168, 76, 0.03)',
  },
  Modal: {
    color: '#1e2240',
    borderRadius: '16px',
  },
  DataTable: {
    thColor: '#1a1e35',
    tdColor: 'transparent',
    borderColor: 'rgba(201, 168, 76, 0.12)',
    thTextColor: '#c9a84c',
  },
  Alert: {
    borderRadius: '12px',
  },
};
</script>
