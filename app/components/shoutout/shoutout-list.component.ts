import {OnDestroy, NgZone} from '@angular/core';

// nativescript
import * as utils from 'utils/utils';
import {TNSEZAudioPlayer} from 'nativescript-ezaudio';

// libs
import {Store} from '@ngrx/store';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/take';

// app
import {LogService, BaseComponent, FancyAlertService} from '../../frameworks/core.framework/index';
import {ShoutoutModel, COUCHBASE_ACTIONS, ShoutoutService, CouchbaseService} from '../../frameworks/shoutoutplay.framework/index';

declare var zonedCallback: Function;

@BaseComponent({
  moduleId: module.id,
  selector: 'shoutout-list',
  templateUrl: `shoutout-list.component.html`
})
export class ShoutOutListComponent implements OnDestroy {
  public shoutouts$: BehaviorSubject<Array<any>> = new BehaviorSubject([]);
  private _currentIndex: number;
  private _shoutOutPlayer: any;
  private _currentShoutOut: any;

  constructor(private store: Store<any>, private logger: LogService, private shoutoutService: ShoutoutService, public couchbaseService: CouchbaseService, private fancyalert: FancyAlertService, private ngZone: NgZone) {
    this._shoutOutPlayer = new TNSEZAudioPlayer(true);
    this._shoutOutPlayer.delegate().audioEvents.on('reachedEnd', zonedCallback((eventData) => {
      this.logger.debug(`ShoutOutListComponent: audioEvents.on('reachedEnd')`);
      this.toggleShoutOutPlay(false, false);
    }));

    this.store.take(1).subscribe((s: any) => {
      let playlists = [...s.couchbase.playlists];
      let shoutouts = [...s.couchbase.shoutouts];
      for (let s of shoutouts) {
        // find track names
        for (let p of playlists) {
          for (let t of p.tracks) {
            if (t.shoutoutId === s.tmpId) {
              s.track = t.name;
              break;
            }
          }
        }
      }
      this.shoutouts$.next(shoutouts);
    });
  } 

  public togglePlay(shoutout: any) {
    this.toggleShoutOutPlay(shoutout, (this._currentShoutOut ? shoutout.tmpId !== this._currentShoutOut.tmpId : true));
  } 

  private toggleShoutOutPlay(shoutout?: any, reload?: boolean) {
    if (shoutout) {
      // don't hang on to reference, instead create clone
      this._currentShoutOut = Object.assign({}, shoutout);
    }
   
    this.logger.debug(`_shoutOutPlayer.togglePlay`);
    this.logger.debug(this._currentShoutOut.recordingPath);
    this._shoutOutPlayer.togglePlay(this._currentShoutOut.recordingPath, reload); 

    // adjust state
    this._currentShoutOut.playing = !this._currentShoutOut.playing;
    let shoutouts = [...this.shoutouts$.getValue()];
    for (let s of shoutouts) {
      if (s.tmpId === this._currentShoutOut.tmpId) {
        s.playing = this._currentShoutOut.playing;
        this.logger.debug(`set playing: ${s.playing}`);
      } else {
        s.playing = false;
      }
    }
    this.ngZone.run(() => {
      this.shoutouts$.next([...shoutouts]);
    });
  }

  public remove(e: any) {
    this.fancyalert.confirm('Are you sure you want to delete this ShoutOut?', 'warning', () => {
      let shoutouts = [...this.shoutouts$.getValue()];
      this.shoutoutService.removeShoutout(shoutouts[this._currentIndex]).then(() => {
        shoutouts.splice(this._currentIndex, 1);
        this.shoutouts$.next(shoutouts);
      });
    });
  }

  public onSwipeCellStarted(args: any) {
    let density = utils.layout.getDisplayDensity();
    let delta = Math.floor(density) !== density ? 1.1 : .1;
    var swipeLimits = args.data.swipeLimits;  
    swipeLimits.top = 0;
    swipeLimits.bottom = 0;
    swipeLimits.left = Math.round(density * 100);
    swipeLimits.right = Math.round(density * 100);
    swipeLimits.threshold = Math.round(density * 50);
  }

  public onSwipeCellFinished(args: any) {
    this._currentIndex = args.itemIndex;
  }

  ngOnDestroy() {
    if (this._shoutOutPlayer) {
      this._shoutOutPlayer.delegate().audioEvents.off('reachedEnd');
      this._shoutOutPlayer = undefined;
    }
  }
}