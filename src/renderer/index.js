import { render } from 'react-dom';
import App from './App';
import {initContract} from './utils/near.utils'

window.nearInitPromise = initContract()
  .then(() => {
    render(<App />, document.getElementById('root'));
  })
  .catch(console.error)


