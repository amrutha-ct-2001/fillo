import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

import {lightPalette} from '../theme/tokens';

export type IconName =
  | 'points'
  | 'home'
  | 'vehicle'
  | 'history'
  | 'profile'
  | 'dashboard'
  | 'customers'
  | 'staff'
  | 'settings'
  | 'person'
  | 'chevron-right'
  | 'chevron-left'
  | 'camera'
  | 'search'
  | 'phone'
  | 'plate'
  | 'plus'
  | 'check'
  | 'check-circle'
  | 'clock'
  | 'logout'
  | 'fill'
  | 'drop'
  | 'scanner'
  | 'cloud-done'
  | 'cloud-off'
  | 'stars'
  | 'edit'
  | 'gas-station'
  | 'badge'
  | 'offline-bolt'
  | 'pin'
  | 'call'
  | 'sync'
  | 'flashlight'
  | 'bolt'
  | 'verified'
  | 'payments'
  | 'credit-card'
  | 'qr'
  | 'arrow-forward'
  | 'dialpad'
  | 'gallery'
  | 'info'
  | 'print'
  | 'sms'
  | 'storefront'
  | 'wallet'
  | 'contactless'
  | 'density'
  | 'sunny'
  | 'cell-tower'
  | 'eye'
  | 'eye-off';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({name, size = 22, color = lightPalette.textPrimary}: Props) {
  const stroke = color;
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
  };

  switch (name) {
    case 'points':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="2" />
          <Path
            d="M12 7v10M9 10.5c.8-1 2-1.5 3-1.5s2.2.5 3 1.5M9 13.5c.8 1 2 1.5 3 1.5s2.2-.5 3-1.5"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'home':
      return (
        <Svg {...common}>
          <Path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'vehicle':
      return (
        <Svg {...common}>
          <Path
            d="M5 16h14M7 16l1.2-6.2A2 2 0 0 1 10.2 8h3.6a2 2 0 0 1 2 1.8L17 16"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="8" cy="17.5" r="1.5" fill={stroke} />
          <Circle cx="16" cy="17.5" r="1.5" fill={stroke} />
          <Path
            d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8"
            stroke={stroke}
            strokeWidth="2"
          />
        </Svg>
      );
    case 'history':
      return (
        <Svg {...common}>
          <Path
            d="M3 12a9 9 0 1 0 3-6.7"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Path
            d="M3 4v5h5M12 7v5l3.5 2"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'profile':
    case 'person':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="8" r="3.5" stroke={stroke} strokeWidth="2" />
          <Path
            d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'dashboard':
      return (
        <Svg {...common}>
          <Rect x="3" y="3" width="8" height="8" rx="1.5" stroke={stroke} strokeWidth="2" />
          <Rect x="13" y="3" width="8" height="5" rx="1.5" stroke={stroke} strokeWidth="2" />
          <Rect x="13" y="10" width="8" height="11" rx="1.5" stroke={stroke} strokeWidth="2" />
          <Rect x="3" y="13" width="8" height="8" rx="1.5" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case 'customers':
      return (
        <Svg {...common}>
          <Circle cx="9" cy="8" r="3" stroke={stroke} strokeWidth="2" />
          <Circle cx="17" cy="9" r="2.5" stroke={stroke} strokeWidth="2" />
          <Path
            d="M3 19c1.2-3 3.2-4.5 6-4.5s4.8 1.5 6 4.5M14 14.5c1.4-.4 2.8-.2 4 1.5"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'staff':
    case 'badge':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="7" r="3" stroke={stroke} strokeWidth="2" />
          <Path
            d="M5 20c1.5-3.2 4-4.8 7-4.8s5.5 1.6 7 4.8"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Path
            d="M16 4.5 18 3l1 2.5"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'settings':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth="2" />
          <Path
            d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 16l1.6 1.5M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.5M17.5 8l1.6-1.5"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'chevron-right':
    case 'arrow-forward':
      return (
        <Svg {...common}>
          <Path
            d="M9 6l6 6-6 6"
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'chevron-left':
      return (
        <Svg {...common}>
          <Path
            d="M15 6l-6 6 6 6"
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'camera':
      return (
        <Svg {...common}>
          <Path
            d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2l1.2-1.5A1.5 1.5 0 0 1 10.9 4h2.2a1.5 1.5 0 0 1 1.2.5L15.5 6h2A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-9Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="13" r="3.5" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case 'gallery':
      return (
        <Svg {...common}>
          <Rect x="3" y="5" width="18" height="14" rx="2" stroke={stroke} strokeWidth="2" />
          <Circle cx="8.5" cy="10" r="1.5" fill={stroke} />
          <Path
            d="M3 16l5-4 3 2.5 3-3.5 7 5"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'search':
      return (
        <Svg {...common}>
          <Circle cx="11" cy="11" r="6.5" stroke={stroke} strokeWidth="2" />
          <Path
            d="M16.5 16.5 21 21"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'phone':
    case 'call':
      return (
        <Svg {...common}>
          <Path
            d="M8.5 4.5h3A1.5 1.5 0 0 1 13 6v12a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 7 18V6A1.5 1.5 0 0 1 8.5 4.5Z"
            stroke={stroke}
            strokeWidth="2"
          />
          <Path d="M10 17h1" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'plate':
    case 'pin':
      return (
        <Svg {...common}>
          <Rect x="3" y="8" width="18" height="8" rx="2" stroke={stroke} strokeWidth="2" />
          <Path
            d="M7 12h2M11 12h2M15 12h2"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'plus':
      return (
        <Svg {...common}>
          <Path
            d="M12 5v14M5 12h14"
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'check':
    case 'check-circle':
    case 'verified':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="2" />
          <Path
            d="M8 12.5 10.8 15.2 16 9.5"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'clock':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="2" />
          <Path
            d="M12 7v5l3 2"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'logout':
      return (
        <Svg {...common}>
          <Path
            d="M14 7V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Path
            d="M9 12h11m0 0-3-3m3 3-3 3"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'fill':
    case 'drop':
      return (
        <Svg {...common}>
          <Path
            d="M12 3c0 0-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'scanner':
    case 'qr':
      return (
        <Svg {...common}>
          <Path
            d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <Rect x="8" y="8" width="3.5" height="3.5" stroke={stroke} strokeWidth="1.8" />
          <Rect x="12.5" y="8" width="3.5" height="3.5" stroke={stroke} strokeWidth="1.8" />
          <Rect x="8" y="12.5" width="3.5" height="3.5" stroke={stroke} strokeWidth="1.8" />
          <Path d="M13 13h1.5v1.5H13V13Zm2.5 0H17v3.5h-3.5V15H15.5V13Z" fill={stroke} />
        </Svg>
      );
    case 'cloud-done':
      return (
        <Svg {...common}>
          <Path
            d="M7.5 17H17a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 7.1 7.4 3.5 3.5 0 0 0 7.5 17Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path
            d="M9.5 12.5 11.2 14.2 14.5 10.5"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'cloud-off':
    case 'offline-bolt':
      return (
        <Svg {...common}>
          <Path
            d="M7.5 17H17a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 7.1 7.4 3.5 3.5 0 0 0 7.5 17Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path
            d="M5 5l14 14"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'stars':
      return (
        <Svg {...common}>
          <Path
            d="M12 3.5 13.9 9h5.6l-4.5 3.4 1.7 5.6L12 14.8 7.3 18l1.7-5.6L4.5 9h5.6L12 3.5Z"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'edit':
      return (
        <Svg {...common}>
          <Path
            d="M4 20h4l11-11-4-4L4 16v4Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path d="M13 7l4 4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'gas-station':
      return (
        <Svg {...common}>
          <Path
            d="M6 4h8v14H6V4Zm8 4h2.5A2.5 2.5 0 0 1 19 10.5V16a2 2 0 1 0 2-2V9l-2-2"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d="M4 20h12" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'sync':
      return (
        <Svg {...common}>
          <Path
            d="M4.5 12a7.5 7.5 0 0 1 12.4-5.7L19 4v6h-6l2.2-2.2A5.5 5.5 0 1 0 17.5 14"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'flashlight':
      return (
        <Svg {...common}>
          <Path
            d="M8 2h8v4l-1 2v12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V8L8 6V2Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path d="M10 12h4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'bolt':
      return (
        <Svg {...common}>
          <Path
            d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'payments':
    case 'wallet':
      return (
        <Svg {...common}>
          <Rect x="3" y="6" width="18" height="12" rx="2" stroke={stroke} strokeWidth="2" />
          <Path d="M3 10h18" stroke={stroke} strokeWidth="2" />
          <Circle cx="16.5" cy="14" r="1.2" fill={stroke} />
        </Svg>
      );
    case 'credit-card':
      return (
        <Svg {...common}>
          <Rect x="2.5" y="5" width="19" height="14" rx="2" stroke={stroke} strokeWidth="2" />
          <Path d="M2.5 9.5h19" stroke={stroke} strokeWidth="2" />
          <Path d="M6 15h4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'dialpad':
      return (
        <Svg {...common}>
          <Circle cx="7" cy="6" r="1.4" fill={stroke} />
          <Circle cx="12" cy="6" r="1.4" fill={stroke} />
          <Circle cx="17" cy="6" r="1.4" fill={stroke} />
          <Circle cx="7" cy="11" r="1.4" fill={stroke} />
          <Circle cx="12" cy="11" r="1.4" fill={stroke} />
          <Circle cx="17" cy="11" r="1.4" fill={stroke} />
          <Circle cx="7" cy="16" r="1.4" fill={stroke} />
          <Circle cx="12" cy="16" r="1.4" fill={stroke} />
          <Circle cx="17" cy="16" r="1.4" fill={stroke} />
        </Svg>
      );
    case 'info':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="2" />
          <Path d="M12 10v6M12 7.5h.01" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </Svg>
      );
    case 'print':
      return (
        <Svg {...common}>
          <Path
            d="M7 8V4h10v4M7 16H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Rect x="7" y="14" width="10" height="6" rx="1" stroke={stroke} strokeWidth="2" />
        </Svg>
      );
    case 'sms':
      return (
        <Svg {...common}>
          <Path
            d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'storefront':
      return (
        <Svg {...common}>
          <Path
            d="M4 9 6 4h12l2 5M4 9v10h16V9M4 9h16"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <Path d="M9 19v-6h6v6" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </Svg>
      );
    case 'contactless':
      return (
        <Svg {...common}>
          <Path
            d="M8 8.5a5 5 0 0 1 0 7M11 6.5a8 8 0 0 1 0 11M14 4.5a11 11 0 0 1 0 15"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'density':
      return (
        <Svg {...common}>
          <Path
            d="M4 7h16M4 12h16M4 17h16"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'sunny':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="4" stroke={stroke} strokeWidth="2" />
          <Path
            d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'cell-tower':
      return (
        <Svg {...common}>
          <Path
            d="M12 3v10M8 21l4-8 4 8M6 8a8 8 0 0 1 12 0M8.5 10.5a5 5 0 0 1 7 0"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'eye':
      return (
        <Svg {...common}>
          <Path
            d="M12 9a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3m0 8a5 5 0 0 1-5-5a5 5 0 0 1 5-5a5 5 0 0 1 5 5a5 5 0 0 1-5 5m0-12.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5"
            fill={color}
          />
        </Svg>
      );
    case 'eye-off':
      // Drawn on a 20-unit grid.
      return (
        <Svg {...common} viewBox="0 0 20 20">
          <Path d="M12.49 9.94A2.5 2.5 0 0 0 10 7.5z" fill={color} />
          <Path
            d="M8.2 5.9a4.4 4.4 0 0 1 1.8-.4a4.5 4.5 0 0 1 4.5 4.5a4.3 4.3 0 0 1-.29 1.55L17 14.14A14 14 0 0 0 20 10s-3-7-10-7a9.6 9.6 0 0 0-4 .85zM2 2L1 3l2.55 2.4A13.9 13.9 0 0 0 0 10s3 7 10 7a9.7 9.7 0 0 0 4.64-1.16L18 19l1-1zm8 12.5A4.5 4.5 0 0 1 5.5 10a4.45 4.45 0 0 1 .6-2.2l1.53 1.44a2.5 2.5 0 0 0-.13.76a2.49 2.49 0 0 0 3.41 2.32l1.54 1.45a4.47 4.47 0 0 1-2.45.73"
            fill={color}
          />
        </Svg>
      );
    default:
      return null;
  }
}
