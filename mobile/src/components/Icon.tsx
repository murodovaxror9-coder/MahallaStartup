import Ban from 'lucide-react-native/icons/ban';
import Bell from 'lucide-react-native/icons/bell';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import Camera from 'lucide-react-native/icons/camera';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import CircleCheck from 'lucide-react-native/icons/circle-check';
import CircleDot from 'lucide-react-native/icons/circle-dot';
import CircleEllipsis from 'lucide-react-native/icons/circle-ellipsis';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import Clock from 'lucide-react-native/icons/clock';
import Construction from 'lucide-react-native/icons/construction';
import Droplet from 'lucide-react-native/icons/droplet';
import Ellipsis from 'lucide-react-native/icons/ellipsis';
import Flag from 'lucide-react-native/icons/flag';
import House from 'lucide-react-native/icons/house';
import ImageIcon from 'lucide-react-native/icons/image';
import Inbox from 'lucide-react-native/icons/inbox';
import KeyRound from 'lucide-react-native/icons/key-round';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import LogOut from 'lucide-react-native/icons/log-out';
import MapPin from 'lucide-react-native/icons/map-pin';
import Megaphone from 'lucide-react-native/icons/megaphone';
import Merge from 'lucide-react-native/icons/merge';
import MessageSquare from 'lucide-react-native/icons/message-square';
import PenLine from 'lucide-react-native/icons/pen-line';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import RotateCcw from 'lucide-react-native/icons/rotate-ccw';
import RotateCw from 'lucide-react-native/icons/rotate-cw';
import Send from 'lucide-react-native/icons/send';
import SendHorizontal from 'lucide-react-native/icons/send-horizontal';
import Trash2 from 'lucide-react-native/icons/trash-2';
import Trees from 'lucide-react-native/icons/trees';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import Trophy from 'lucide-react-native/icons/trophy';
import User from 'lucide-react-native/icons/user';
import Users from 'lucide-react-native/icons/users';
import Vote from 'lucide-react-native/icons/vote';
import Wrench from 'lucide-react-native/icons/wrench';
import X from 'lucide-react-native/icons/x';
import { C } from '@/theme';

const ICONS = {
  Ban,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDot,
  CircleEllipsis,
  ClipboardList,
  Clock,
  Construction,
  Droplet,
  Ellipsis,
  Flag,
  House,
  Image: ImageIcon,
  Inbox,
  KeyRound,
  Lightbulb,
  LogOut,
  MapPin,
  Megaphone,
  Merge,
  MessageSquare,
  PenLine,
  Pencil,
  Plus,
  RotateCcw,
  RotateCw,
  Send,
  SendHorizontal,
  Trash2,
  Trees,
  TriangleAlert,
  Trophy,
  User,
  Users,
  Vote,
  Wrench,
  X,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color = C.ink,
  strokeWidth = 2,
}: {
  name: IconName | string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const Cmp = ICONS[name as IconName] ?? CircleEllipsis;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
