import React, {
  Component,
  cloneElement,
  isValidElement,
  createRef,
  ReactNode,
  CSSProperties,
  ReactElement,
  Key,
} from 'react'
import { Icon } from '@iconify/react'
// import ProgressBar from './ProgressBar'
import ProgressBarForwardRef from './ProgressBar'
import CurrentTime from './CurrentTime'
import Duration from './Duration'
import VolumeBar from './VolumeBar'
import { RHAP_UI, MAIN_LAYOUT, AUDIO_PRELOAD_ATTRIBUTE, TIME_FORMAT } from './constants'
import { throttle, getMainLayoutClassName, getDisplayTimeBySeconds } from './utils'

type CustomUIModule = RHAP_UI | ReactElement
type CustomUIModules = Array<CustomUIModule>
type OnSeek = (audio: HTMLAudioElement, time: number) => Promise<void>

interface MSEPropsObject {
  onSeek: OnSeek
  onEcrypted?: (e: unknown) => void
  srcDuration: number
}

interface PlayerProps {
  /**
   * HTML5 Audio tag autoPlay property
   */
  autoPlay?: boolean
  /**
   * Whether to play audio after src prop is changed
   */
  autoPlayAfterSrcChange?: boolean
  /**
   * custom classNames
   */
  className?: string
  /**
   * The time interval to trigger onListen
   */
  listenInterval?: number
  progressJumpStep?: number
  progressJumpSteps?: {
    backward?: number
    forward?: number
  }
  volumeJumpStep?: number
  loop?: boolean
  muted?: boolean
  crossOrigin?: React.AudioHTMLAttributes<HTMLAudioElement>['crossOrigin']
  mediaGroup?: string
  hasDefaultKeyBindings?: boolean
  onAbort?: (e: Event) => void
  onCanPlay?: (e: Event) => void
  onCanPlayThrough?: (e: Event) => void
  onEnded?: (e: Event) => void
  onPlaying?: (e: Event) => void
  onSeeking?: (e: Event) => void
  onSeeked?: (e: Event) => void
  onStalled?: (e: Event) => void
  onSuspend?: (e: Event) => void
  onLoadStart?: (e: Event) => void
  onLoadedMetaData?: (e: Event) => void
  onLoadedData?: (e: Event) => void
  onWaiting?: (e: Event) => void
  onEmptied?: (e: Event) => void
  onError?: (e: Event) => void
  onListen?: (e: Event) => void
  onVolumeChange?: (e: Event) => void
  onPause?: (e: Event) => void
  onPlay?: (e: Event) => void
  onClickPrevious?: (e: React.SyntheticEvent) => void
  onClickNext?: (e: React.SyntheticEvent) => void
  onPlayError?: (err: Error) => void
  onChangeCurrentTimeError?: (err: Error) => void
  mse?: MSEPropsObject
  /**
   * HTML5 Audio tag preload property
   */
  preload?: AUDIO_PRELOAD_ATTRIBUTE
  /**
   * Pregress indicator refresh interval
   */
  progressUpdateInterval?: number
  /**
   * HTML5 Audio tag src property
   */
  src?: string
  defaultCurrentTime?: ReactNode
  defaultDuration?: ReactNode
  volume?: number
  showJumpControls?: boolean
  showSkipControls?: boolean
  showDownloadProgress?: boolean
  showFilledProgress?: boolean
  showFilledVolume?: boolean
  timeFormat?: TIME_FORMAT
  header?: ReactNode
  footer?: ReactNode
  customIcons?: CustomIcons
  layout?: MAIN_LAYOUT
  customProgressBarSection?: CustomUIModules
  customControlsSection?: CustomUIModules
  customAdditionalControls?: CustomUIModules
  customVolumeControls?: CustomUIModules
  i18nAriaLabels?: I18nAriaLabels
  children?: ReactNode
  style?: CSSProperties
}

interface CustomIcons {
  play?: ReactNode
  pause?: ReactNode
  rewind?: ReactNode
  forward?: ReactNode
  previous?: ReactNode
  next?: ReactNode
  loop?: ReactNode
  loopOff?: ReactNode
  volume?: ReactNode
  volumeMute?: ReactNode
}

interface I18nAriaLabels {
  player?: string
  progressControl?: string
  volumeControl?: string
  play?: string
  pause?: string
  rewind?: string
  forward?: string
  previous?: string
  next?: string
  loop?: string
  loopOff?: string
  volume?: string
  volumeMute?: string
}

class H5AudioPlayer extends Component<PlayerProps> {
  static defaultProps: PlayerProps = {
    autoPlay: false,
    autoPlayAfterSrcChange: true,
    listenInterval: 1000,
    progressJumpStep: 5000,
    progressJumpSteps: {}, // define when removing progressJumpStep
    volumeJumpStep: 0.1,
    loop: false,
    muted: false,
    preload: 'auto',
    progressUpdateInterval: 20,
    defaultCurrentTime: '--:--',
    defaultDuration: '--:--',
    timeFormat: 'auto',
    volume: 1,
    className: '',
    showJumpControls: true,
    showSkipControls: false,
    showDownloadProgress: true,
    showFilledProgress: true,
    showFilledVolume: false,
    customIcons: {},
    customProgressBarSection: [RHAP_UI.CURRENT_TIME, RHAP_UI.PROGRESS_BAR, RHAP_UI.DURATION],
    customControlsSection: [RHAP_UI.ADDITIONAL_CONTROLS, RHAP_UI.MAIN_CONTROLS, RHAP_UI.VOLUME_CONTROLS],
    customAdditionalControls: [RHAP_UI.LOOP],
    customVolumeControls: [RHAP_UI.VOLUME],
    layout: 'stacked',
    hasDefaultKeyBindings: true,
    i18nAriaLabels: {
      player: 'Audio player',
      progressControl: 'Audio progress control',
      volumeControl: 'Volume control',
      play: 'Play',
      pause: 'Pause',
      rewind: 'Rewind',
      forward: 'Forward',
      previous: 'Previous',
      next: 'Skip',
      loop: 'Disable loop',
      loopOff: 'Enable loop',
      volume: 'Mute',
      volumeMute: 'Unmute',
    },
  }

  audio = createRef<HTMLAudioElement>()

  progressBar = createRef<HTMLDivElement>()

  container = createRef<HTMLDivElement>()

  lastVolume: number = this.props.volume // To store the volume before clicking mute button

  listenTracker?: number // Determine whether onListen event should be called continuously

  volumeAnimationTimer?: number

  downloadProgressAnimationTimer?: number

  togglePlay = (e: React.SyntheticEvent): void => {
    e.stopPropagation()
    const audio = this.audio.current
    if ((audio.paused || audio.ended) && audio.src) {
      this.playAudioPromise()
    } else if (!audio.paused) {
      audio.pause()
    }
  }

  /**
   * Safely play audio
   *
   * Reference: https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
   */
  playAudioPromise = (): void => {
    if (this.audio.current.error) {
      this.audio.current.load()
    }
    const playPromise = this.audio.current.play()
    // playPromise is null in IE 11
    if (playPromise) {
      playPromise.then(null).catch((err) => {
        const { onPlayError } = this.props
        onPlayError && onPlayError(new Error(err))
      })
    } else {
      // Remove forceUpdate when stop supporting IE 11
      this.forceUpdate()
    }
  }

  isPlaying = (): boolean => {
    const audio = this.audio.current
    if (!audio) return false

    return !audio.paused && !audio.ended
  }

  handlePlay = (e: Event): void => {
    this.forceUpdate()
    this.props.onPlay && this.props.onPlay(e)
  }

  handlePause = (e: Event): void => {
    if (!this.audio) return
    this.forceUpdate()
    this.props.onPause && this.props.onPause(e)
  }

  handleEnded = (e: Event): void => {
    if (!this.audio) return
    // Remove forceUpdate when stop supporting IE 11
    this.forceUpdate()
    this.props.onEnded && this.props.onEnded(e)
  }

  handleAbort = (e: Event): void => {
    this.props.onAbort && this.props.onAbort(e)
  }

  handleClickVolumeButton = (): void => {
    const audio = this.audio.current
    if (audio.volume > 0) {
      this.lastVolume = audio.volume
      audio.volume = 0
    } else {
      audio.volume = this.lastVolume
    }
  }

  handleMuteChange = (): void => {
    this.forceUpdate()
  }

  handleClickLoopButton = (): void => {
    this.audio.current.loop = !this.audio.current.loop
    this.forceUpdate()
  }

  handleClickRewind = (): void => {
    const { progressJumpSteps, progressJumpStep } = this.props
    const jumpStep = progressJumpSteps.backward || progressJumpStep
    this.setJumpTime(-jumpStep)
  }

  handleClickForward = (): void => {
    const { progressJumpSteps, progressJumpStep } = this.props
    const jumpStep = progressJumpSteps.forward || progressJumpStep
    this.setJumpTime(jumpStep)
  }

  setJumpTime = (time: number): void => {
    const audio = this.audio.current
    const { duration, currentTime: prevTime } = audio
    if (
      audio.readyState === audio.HAVE_NOTHING ||
      audio.readyState === audio.HAVE_METADATA ||
      !isFinite(duration) ||
      !isFinite(prevTime)
    ) {
      try {
        audio.load()
      } catch (err) {
        return this.props.onChangeCurrentTimeError && this.props.onChangeCurrentTimeError(err as Error)
      }
    }
    let currentTime = prevTime + time / 1000
    if (currentTime < 0) {
      audio.currentTime = 0
      currentTime = 0
    } else if (currentTime > duration) {
      audio.currentTime = duration
      currentTime = duration
    } else {
      audio.currentTime = currentTime
    }
  }

  setJumpVolume = (volume: number): void => {
    let newVolume = this.audio.current.volume + volume
    if (newVolume < 0) newVolume = 0
    else if (newVolume > 1) newVolume = 1
    this.audio.current.volume = newVolume
  }

  handleKeyDown = (e: React.KeyboardEvent): void => {
    if (this.props.hasDefaultKeyBindings) {
      switch (e.key) {
        case ' ':
          if (e.target === this.container.current || e.target === this.progressBar.current) {
            e.preventDefault() // Prevent scrolling page by pressing Space key
            this.togglePlay(e)
          }
          break
        case 'ArrowLeft':
          this.handleClickRewind()
          break
        case 'ArrowRight':
          this.handleClickForward()
          break
        case 'ArrowUp':
          e.preventDefault() // Prevent scrolling page by pressing arrow key
          this.setJumpVolume(this.props.volumeJumpStep)
          break
        case 'ArrowDown':
          e.preventDefault() // Prevent scrolling page by pressing arrow key
          this.setJumpVolume(-this.props.volumeJumpStep)
          break
        case 'l':
          this.handleClickLoopButton()
          break
        case 'm':
          this.handleClickVolumeButton()
          break
      }
    }
  }

  renderUIModules = (modules: CustomUIModules): Array<ReactElement> => {
    return modules.map((comp, i) => this.renderUIModule(comp, i))
  }

  renderUIModule = (comp: CustomUIModule, key: Key): ReactElement => {
    const {
      defaultCurrentTime,
      progressUpdateInterval,
      showDownloadProgress,
      showFilledProgress,
      showFilledVolume,
      defaultDuration,
      customIcons,
      showSkipControls,
      onClickPrevious,
      onClickNext,
      onChangeCurrentTimeError,
      showJumpControls,
      customAdditionalControls,
      customVolumeControls,
      muted,
      timeFormat,
      volume: volumeProp,
      loop: loopProp,
      mse,
      i18nAriaLabels,
    } = this.props

    switch (comp) {
      case RHAP_UI.CURRENT_TIME:
        return (
          <div key={key} id="rhap_current-time" className="rhap_time rhap_current-time">
            <CurrentTime
              audio={this.audio.current}
              isLeftTime={false}
              defaultCurrentTime={defaultCurrentTime}
              timeFormat={timeFormat}
            />
          </div>
        )
      case RHAP_UI.CURRENT_LEFT_TIME:
        return (
          <div key={key} id="rhap_current-left-time" className="rhap_time rhap_current-left-time">
            <CurrentTime
              audio={this.audio.current}
              isLeftTime={true}
              defaultCurrentTime={defaultCurrentTime}
              timeFormat={timeFormat}
            />
          </div>
        )
      case RHAP_UI.PROGRESS_BAR:

        const PhoneCord = (
          <svg width="586" height="24" viewBox="0 0 586 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.32024e-05 21L14.4292 21C20.5386 21 26.1088 17.5027 28.7633 12L31.1652 7.02095C32.3512 4.56252 34.8398 3 37.5693 3V3C40.2256 3 42.6604 4.48067 43.8825 6.8392L49.3271 17.3472C50.4898 19.5913 52.8064 21 55.3337 21V21C57.9307 21 60.2985 19.5134 61.4269 17.1743L66.3241 7.02266C67.5105 4.56319 70.0002 2.99999 72.7309 2.99999V2.99999C75.3883 2.99999 77.8242 4.4813 79.0468 6.84084L84.4905 17.3472C85.6532 19.5913 87.9698 21 90.4971 21V21C93.0941 21 95.4619 19.5134 96.5903 17.1743L101.488 7.02097C102.674 4.56253 105.163 2.99999 107.892 2.99999V2.99999C110.549 2.99999 112.984 4.48067 114.206 6.83921L119.65 17.3472C120.813 19.5913 123.129 21 125.657 21V21C128.254 21 130.622 19.5134 131.75 17.1743L136.647 7.02192C137.834 4.5629 140.323 2.99999 143.053 2.99999V2.99999C145.71 2.99999 148.145 4.48102 149.368 6.84013L154.812 17.3472C155.975 19.5913 158.291 21 160.819 21V21C163.416 21 165.783 19.5134 166.912 17.1743L171.81 7.02096C172.996 4.56252 175.484 2.99998 178.214 2.99998V2.99998C180.87 2.99998 183.305 4.48066 184.527 6.83921L189.972 17.3472C191.134 19.5912 193.451 21 195.978 21V21C198.575 21 200.943 19.5134 202.071 17.1743L206.968 7.02269C208.155 4.56319 210.645 2.99998 213.375 2.99998V2.99998C216.033 2.99998 218.469 4.48131 219.691 6.84088L225.135 17.3472C226.298 19.5912 228.614 21 231.142 21V21C233.739 21 236.106 19.5134 237.235 17.1743L242.133 7.02096C243.319 4.56251 245.807 2.99998 248.537 2.99998V2.99998C251.193 2.99998 253.628 4.48066 254.85 6.8392L260.295 17.3472C261.457 19.5912 263.774 21 266.301 21V21C268.898 21 271.266 19.5134 272.394 17.1743L277.292 7.02189C278.478 4.56288 280.967 2.99998 283.698 2.99998V2.99998C286.354 2.99997 288.79 4.481 290.012 6.8401L295.456 17.3472C296.619 19.5912 298.936 21 301.463 21V21C304.06 21 306.428 19.5134 307.556 17.1743L312.454 7.02093C313.64 4.5625 316.129 2.99997 318.858 2.99997V2.99997C321.515 2.99997 323.949 4.48065 325.171 6.83919L330.616 17.3472C331.779 19.5912 334.095 21 336.623 21V21C339.22 21 341.587 19.5133 342.716 17.1743L347.613 7.02265C348.799 4.56317 351.289 2.99997 354.02 2.99997V2.99997C356.677 2.99997 359.113 4.48128 360.336 6.84083L365.779 17.3472C366.942 19.5912 369.259 21 371.786 21V21C374.383 21 376.751 19.5133 377.879 17.1743L382.777 7.02093C383.963 4.5625 386.452 2.99997 389.181 2.99997V2.99997C391.838 2.99997 394.272 4.48064 395.494 6.83918L400.939 17.3472C402.102 19.5912 404.418 21 406.946 21V21C409.543 21 411.91 19.5133 413.039 17.1743L417.936 7.02188C419.123 4.56287 421.612 2.99996 424.342 2.99996V2.99996C426.999 2.99996 429.434 4.48099 430.657 6.84009L436.101 17.3472C437.263 19.5912 439.58 21 442.107 21V21C444.704 21 447.072 19.5133 448.201 17.1743L453.099 7.02093C454.284 4.56249 456.773 2.99996 459.503 2.99996V2.99996C462.159 2.99996 464.594 4.48064 465.816 6.83918L471.26 17.3472C472.423 19.5912 474.74 21 477.267 21V21C479.864 21 482.232 19.5133 483.36 17.1743L488.257 7.02264C489.444 4.56316 491.933 2.99996 494.664 2.99996V2.99996C497.322 2.99996 499.758 4.48126 500.98 6.84081L506.424 17.3472C507.587 19.5912 509.903 21 512.43 21V21C515.027 21 517.395 19.5133 518.524 17.1743L523.422 7.02092C524.608 4.56249 527.096 2.99995 529.826 2.99995V2.99995C532.482 2.99995 534.917 4.48063 536.139 6.83917L541.583 17.3472C542.746 19.5912 545.063 21 547.59 21V21C550.187 21 552.555 19.5133 553.683 17.1743L556.179 12C558.834 6.49733 564.404 2.99995 570.513 2.99995L586 2.99995" stroke="#E3E3DE" stroke-width="5" />
          </svg>
        )

        return (
          // <ProgressBar
          //   key={key}
          //   ref={this.progressBar}
          //   audio={this.audio.current}
          //   progressUpdateInterval={progressUpdateInterval}
          //   showDownloadProgress={showDownloadProgress}
          //   showFilledProgress={showFilledProgress}
          //   onSeek={mse && mse.onSeek}
          //   onChangeCurrentTimeError={onChangeCurrentTimeError}
          //   srcDuration={mse && mse.srcDuration}
          //   i18nProgressBar={i18nAriaLabels.progressControl}
          // />

          <ProgressBarForwardRef
            audio={this.audio.current}
            progressUpdateInterval={progressUpdateInterval}
            svg={PhoneCord}
            strokeColor="#32CB08"
            i18nProgressBar="Audio progress bar"
          />
        )
      case RHAP_UI.DURATION:
        return (
          <div key={key} className="rhap_time rhap_total-time">
            {mse && mse.srcDuration ? (
              getDisplayTimeBySeconds(mse.srcDuration, mse.srcDuration, this.props.timeFormat)
            ) : (
              <Duration audio={this.audio.current} defaultDuration={defaultDuration} timeFormat={timeFormat} />
            )}
          </div>
        )
      case RHAP_UI.ADDITIONAL_CONTROLS:
        return (
          <div key={key} className="rhap_additional-controls">
            {this.renderUIModules(customAdditionalControls)}
          </div>
        )
      case RHAP_UI.MAIN_CONTROLS: {
        const isPlaying = this.isPlaying()
        let actionIcon: ReactNode
        if (isPlaying) {
          actionIcon = customIcons.pause ? customIcons.pause : <Icon icon="mdi:pause-circle" />
        } else {
          actionIcon = customIcons.play ? customIcons.play : <Icon icon="mdi:play-circle" />
        }
        return (
          <div key={key} className="rhap_main-controls">
            {showSkipControls && (
              <button
                aria-label={i18nAriaLabels.previous}
                className="rhap_button-clear rhap_main-controls-button rhap_skip-button"
                type="button"
                onClick={onClickPrevious}
              >
                {customIcons.previous ? customIcons.previous : <Icon icon="mdi:skip-previous" />}
              </button>
            )}
            {showJumpControls && (
              <button
                aria-label={i18nAriaLabels.rewind}
                className="rhap_button-clear rhap_main-controls-button rhap_rewind-button"
                type="button"
                onClick={this.handleClickRewind}
              >
                {customIcons.rewind ? customIcons.rewind : <Icon icon="mdi:rewind" />}
              </button>
            )}
            <button
              aria-label={isPlaying ? i18nAriaLabels.pause : i18nAriaLabels.play}
              className="rhap_button-clear rhap_main-controls-button rhap_play-pause-button"
              type="button"
              onClick={this.togglePlay}
            >
              {actionIcon}
            </button>
            {showJumpControls && (
              <button
                aria-label={i18nAriaLabels.forward}
                className="rhap_button-clear rhap_main-controls-button rhap_forward-button"
                type="button"
                onClick={this.handleClickForward}
              >
                {customIcons.forward ? customIcons.forward : <Icon icon="mdi:fast-forward" />}
              </button>
            )}
            {showSkipControls && (
              <button
                aria-label={i18nAriaLabels.next}
                className="rhap_button-clear rhap_main-controls-button rhap_skip-button"
                type="button"
                onClick={onClickNext}
              >
                {customIcons.next ? customIcons.next : <Icon icon="mdi:skip-next" />}
              </button>
            )}
          </div>
        )
      }
      case RHAP_UI.VOLUME_CONTROLS:
        return (
          <div key={key} className="rhap_volume-controls">
            {this.renderUIModules(customVolumeControls)}
          </div>
        )
      case RHAP_UI.LOOP: {
        const loop = this.audio.current ? this.audio.current.loop : loopProp

        let loopIcon: ReactNode
        if (loop) {
          loopIcon = customIcons.loop ? customIcons.loop : <Icon icon="mdi:repeat" />
        } else {
          loopIcon = customIcons.loopOff ? customIcons.loopOff : <Icon icon="mdi:repeat-off" />
        }
        return (
          <button
            key={key}
            aria-label={loop ? i18nAriaLabels.loop : i18nAriaLabels.loopOff}
            className="rhap_button-clear rhap_repeat-button"
            type="button"
            onClick={this.handleClickLoopButton}
          >
            {loopIcon}
          </button>
        )
      }
      case RHAP_UI.VOLUME: {
        const { volume = muted ? 0 : volumeProp } = this.audio.current || {}

        let volumeIcon: ReactNode
        if (volume) {
          volumeIcon = customIcons.volume ? customIcons.volume : <Icon icon="mdi:volume-high" />
        } else {
          volumeIcon = customIcons.volume ? customIcons.volumeMute : <Icon icon="mdi:volume-mute" />
        }
        return (
          <div key={key} className="rhap_volume-container">
            <button
              aria-label={volume ? i18nAriaLabels.volume : i18nAriaLabels.volumeMute}
              onClick={this.handleClickVolumeButton}
              type="button"
              className="rhap_button-clear rhap_volume-button"
            >
              {volumeIcon}
            </button>
            <VolumeBar
              audio={this.audio.current}
              volume={volume}
              onMuteChange={this.handleMuteChange}
              showFilledVolume={showFilledVolume}
              i18nVolumeControl={i18nAriaLabels.volumeControl}
            />
          </div>
        )
      }
      default:
        if (!isValidElement(comp)) {
          return null
        }
        return comp.key ? comp : cloneElement(comp as ReactElement, { key })
    }
  }

  componentDidMount(): void {
    // force update to pass this.audio to child components
    this.forceUpdate()
    // audio player object
    const audio = this.audio.current

    if (this.props.muted) {
      audio.volume = 0
    } else {
      audio.volume = this.lastVolume
    }

    audio.addEventListener('error', (e) => {
      const target = e.target as HTMLAudioElement
      // Calls onEnded when currentTime is the same as duration even if there is an error
      if (target.error && target.currentTime === target.duration) {
        return this.props.onEnded && this.props.onEnded(e)
      }
      this.props.onError && this.props.onError(e)
    })

    // When enough of the file has downloaded to start playing
    audio.addEventListener('canplay', (e) => {
      this.props.onCanPlay && this.props.onCanPlay(e)
    })

    // When enough of the file has downloaded to play the entire file
    audio.addEventListener('canplaythrough', (e) => {
      this.props.onCanPlayThrough && this.props.onCanPlayThrough(e)
    })

    // When audio play starts
    audio.addEventListener('play', this.handlePlay)

    // When unloading the audio player (switching to another src)
    audio.addEventListener('abort', this.handleAbort)

    // When the file has finished playing to the end
    audio.addEventListener('ended', this.handleEnded)

    // When the media has enough data to start playing, after the play event, but also when recovering from being
    // stalled, when looping media restarts, and after seeked, if it was playing before seeking.
    audio.addEventListener('playing', (e) => {
      this.props.onPlaying && this.props.onPlaying(e)
    })

    // When a seek operation begins
    audio.addEventListener('seeking', (e) => {
      this.props.onSeeking && this.props.onSeeking(e)
    })

    // when a seek operation completes
    audio.addEventListener('seeked', (e) => {
      this.props.onSeeked && this.props.onSeeked(e)
    })

    // when the requested operation (such as playback) is delayed pending the completion of another operation (such as
    // a seek).
    audio.addEventListener('waiting', (e) => {
      this.props.onWaiting && this.props.onWaiting(e)
    })

    // The media has become empty; for example, this event is sent if the media has already been loaded (or partially
    // loaded), and the load() method is called to reload it.
    audio.addEventListener('emptied', (e) => {
      this.props.onEmptied && this.props.onEmptied(e)
    })

    // when the user agent is trying to fetch media data, but data is unexpectedly not forthcoming
    audio.addEventListener('stalled', (e) => {
      this.props.onStalled && this.props.onStalled(e)
    })

    // when loading of the media is suspended; this may happen either because the download has completed or because it
    // has been paused for any other reason
    audio.addEventListener('suspend', (e) => {
      this.props.onSuspend && this.props.onSuspend(e)
    })

    //  when loading of the media begins
    audio.addEventListener('loadstart', (e) => {
      this.props.onLoadStart && this.props.onLoadStart(e)
    })

    // when media's metadata has finished loading; all attributes now contain as much useful information as they're
    // going to
    audio.addEventListener('loadedmetadata', (e) => {
      this.props.onLoadedMetaData && this.props.onLoadedMetaData(e)
    })

    // when the first frame of the media has finished loading.
    audio.addEventListener('loadeddata', (e) => {
      this.props.onLoadedData && this.props.onLoadedData(e)
    })

    // When the user pauses playback
    audio.addEventListener('pause', this.handlePause)

    audio.addEventListener(
      'timeupdate',
      throttle((e) => {
        this.props.onListen && this.props.onListen(e)
      }, this.props.listenInterval)
    )

    audio.addEventListener('volumechange', (e) => {
      this.props.onVolumeChange && this.props.onVolumeChange(e)
    })

    audio.addEventListener('encrypted', (e) => {
      const { mse } = this.props
      mse && mse.onEcrypted && mse.onEcrypted(e)
    })
  }

  componentDidUpdate(prevProps: PlayerProps): void {
    const { src, autoPlayAfterSrcChange } = this.props
    if (prevProps.src !== src) {
      if (autoPlayAfterSrcChange) {
        this.playAudioPromise()
      } else {
        // Updating pause icon to play icon
        this.forceUpdate()
      }
    }
  }

  render(): ReactNode {
    const {
      className,
      src,
      loop: loopProp,
      preload,
      autoPlay,
      crossOrigin,
      mediaGroup,
      header,
      footer,
      layout,
      customProgressBarSection,
      customControlsSection,
      children,
      style,
      i18nAriaLabels,
    } = this.props
    const loop = this.audio.current ? this.audio.current.loop : loopProp
    const loopClass = loop ? 'rhap_loop--on' : 'rhap_loop--off'
    const isPlayingClass = this.isPlaying() ? 'rhap_play-status--playing' : 'rhap_play-status--paused'

    return (
      /* We want the container to catch bubbled events */
      /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */
      <div
        role="group"
        /* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */
        tabIndex={0}
        aria-label={i18nAriaLabels.player}
        className={`rhap_container ${loopClass} ${isPlayingClass} ${className}`}
        onKeyDown={this.handleKeyDown}
        ref={this.container}
        style={style}
      >
        {/* User can pass <track> through children */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          src={src}
          controls={false}
          loop={loop}
          autoPlay={autoPlay}
          preload={preload}
          crossOrigin={crossOrigin}
          mediaGroup={mediaGroup}
          ref={this.audio}
        >
          {children}
        </audio>
        {header && <div className="rhap_header">{header}</div>}
        <div className={`rhap_main ${getMainLayoutClassName(layout)}`}>
          <div className="rhap_progress-section">{this.renderUIModules(customProgressBarSection)}</div>
          <div className="rhap_controls-section">{this.renderUIModules(customControlsSection)}</div>
        </div>
        {footer && <div className="rhap_footer">{footer}</div>}
      </div>
    )
  }
}

export default H5AudioPlayer
export { RHAP_UI, OnSeek }
