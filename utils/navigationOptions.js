// utils/navigationOptions.js
import HeaderLogo from '../components/layout/HeaderLogo';

export const commonScreenOptions = ({ title, headerRight }) => ({
  title,
  headerLeft: () => <HeaderLogo />,
  headerTintColor: '#000',
  headerShadowVisible: false,
  headerTitleStyle: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  headerTitle: '',
  headerStyle: {
    backgroundColor: '#fff', // Set the header background color
  },
  headerRight,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
});
