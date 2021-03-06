// libs
import {Store} from '@ngrx/store';

// app
import {ConsoleService, LogService} from '../../core/index';
import {ANALYTICS_PROVIDERS} from '../../analytics/index';

// mocks
import {WindowMock} from '../mocks/window.mock';
import {StoreMock} from '../mocks/@ngrx/store.mock';

export function TEST_COMMON_PROVIDERS(options?: any): any[] {
  // options:
  // Window: token = custom window mock (mainly for changing out language)
  // state:        = needs Store (via ngrx/store)
  
  let providers: Array<any> = [
    {provide: ConsoleService, useValue: console },
    LogService,
    ANALYTICS_PROVIDERS
  ];

  if (options) {
    if (options.state) {
      providers.push({provide: Store, useClass: StoreMock });
    }
  }  
  
  return providers;
}
