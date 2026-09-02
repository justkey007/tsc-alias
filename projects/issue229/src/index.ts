import PortalMQTT from './mqtt/portal';

const initCoatro = async () => {
  // Portal Connection
  PortalMQTT.connect();
};

initCoatro();
