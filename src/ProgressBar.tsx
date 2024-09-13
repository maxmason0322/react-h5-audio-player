import React, { Component, forwardRef, SyntheticEvent } from 'react'
import { getPosX, throttle } from './utils'
import { OnSeek } from './index'

// interface ProgressBarForwardRefProps {
//   audio: HTMLAudioElement
//   progressUpdateInterval: number
//   showDownloadProgress: boolean
//   showFilledProgress: boolean
//   srcDuration?: number
//   onSeek?: OnSeek
//   onChangeCurrentTimeError?: (err: Error) => void
//   i18nProgressBar: string
//   svg: React.ReactElement
//   strokeColor: string
// }

interface ProgressBarForwardRefProps {
  audio: HTMLAudioElement;
  progressUpdateInterval: number;
  onSeek?: OnSeek;
  onChangeCurrentTimeError?: (err: Error) => void;
  i18nProgressBar: string;
  svg: React.ReactElement; // The entire SVG element passed as a prop
  strokeColor: string; // Color for the filled part of the progress bar
}

interface ProgressBarProps extends ProgressBarForwardRefProps {
  progressBar: React.RefObject<SVGSVGElement>;
}

interface ProgressBarState {
  currentTimePos: number;
  isDragging: boolean;
  waitingForSeekCallback: boolean;
}

// interface ProgressBarProps extends ProgressBarForwardRefProps {
//   progressBar: React.RefObject<HTMLDivElement>
// }

// interface ProgressBarState {
//   isDraggingProgress: boolean
//   currentTimePos?: string
//   hasDownloadProgressAnimation: boolean
//   downloadProgressArr: DownloadProgress[]
//   waitingForSeekCallback: boolean
// }

// interface DownloadProgress {
//   left: string
//   width: string
// }

// interface TimePosInfo {
//   currentTime: number
//   currentTimePos: string
// }

class ProgressBar extends Component<ProgressBarProps, ProgressBarState> {
  // audio?: HTMLAudioElement

  // timeOnMouseMove = 0 // Audio's current time while mouse is down and moving over the progress bar

  // hasAddedAudioEventListener = false

  // downloadProgressAnimationTimer?: number

  // state: ProgressBarState = {
  //   isDraggingProgress: false,
  //   currentTimePos: '0%',
  //   hasDownloadProgressAnimation: false,
  //   downloadProgressArr: [],
  //   waitingForSeekCallback: false,
  // }

  // getDuration(): number {
  //   const { audio, srcDuration } = this.props
  //   return typeof srcDuration === 'undefined' ? audio.duration : srcDuration
  // }

  // // Get time info while dragging indicator by mouse or touch
  // getCurrentProgress = (event: MouseEvent | TouchEvent): TimePosInfo => {
  //   const { audio, progressBar } = this.props
  //   const isSingleFileProgressiveDownload =
  //     audio.src.indexOf('blob:') !== 0 && typeof this.props.srcDuration === 'undefined'

  //   if (isSingleFileProgressiveDownload && (!audio.src || !isFinite(audio.currentTime) || !progressBar.current)) {
  //     return { currentTime: 0, currentTimePos: '0%' }
  //   }

  //   const progressBarRect = progressBar.current.getBoundingClientRect()
  //   const maxRelativePos = progressBarRect.width
  //   let relativePos = getPosX(event) - progressBarRect.left

  //   if (relativePos < 0) {
  //     relativePos = 0
  //   } else if (relativePos > maxRelativePos) {
  //     relativePos = maxRelativePos
  //   }
  //   const duration = this.getDuration()
  //   const currentTime = (duration * relativePos) / maxRelativePos
  //   return { currentTime, currentTimePos: `${((relativePos / maxRelativePos) * 100).toFixed(2)}%` }
  // }

  // handleContextMenu = (event: SyntheticEvent): void => {
  //   event.preventDefault()
  // }

  // /* Handle mouse down or touch start on progress bar event */
  // handleMouseDownOrTouchStartProgressBar = (event: React.MouseEvent | React.TouchEvent): void => {
  //   event.stopPropagation()
  //   const { currentTime, currentTimePos } = this.getCurrentProgress(event.nativeEvent)

  //   if (isFinite(currentTime)) {
  //     this.timeOnMouseMove = currentTime
  //     this.setState({ isDraggingProgress: true, currentTimePos })
  //     if (event.nativeEvent instanceof MouseEvent) {
  //       window.addEventListener('mousemove', this.handleWindowMouseOrTouchMove)
  //       window.addEventListener('mouseup', this.handleWindowMouseOrTouchUp)
  //     } else {
  //       window.addEventListener('touchmove', this.handleWindowMouseOrTouchMove)
  //       window.addEventListener('touchend', this.handleWindowMouseOrTouchUp)
  //     }
  //   }
  // }

  // handleWindowMouseOrTouchMove = (event: TouchEvent | MouseEvent): void => {
  //   if (event instanceof MouseEvent) {
  //     event.preventDefault()
  //   }
  //   event.stopPropagation()
  //   // Prevent Chrome drag selection bug
  //   const windowSelection: Selection | null = window.getSelection()
  //   if (windowSelection && windowSelection.type === 'Range') {
  //     windowSelection.empty()
  //   }

  //   const { isDraggingProgress } = this.state
  //   if (isDraggingProgress) {
  //     const { currentTime, currentTimePos } = this.getCurrentProgress(event)
  //     this.timeOnMouseMove = currentTime
  //     this.setState({ currentTimePos })
  //   }
  // }

  // handleWindowMouseOrTouchUp = (event: MouseEvent | TouchEvent): void => {
  //   event.stopPropagation()
  //   const newTime = this.timeOnMouseMove
  //   const { audio, onChangeCurrentTimeError, onSeek } = this.props

  //   if (onSeek) {
  //     this.setState({ isDraggingProgress: false, waitingForSeekCallback: true }, () => {
  //       onSeek(audio, newTime).then(
  //         () => this.setState({ waitingForSeekCallback: false }),
  //         (err) => {
  //           throw new Error(err)
  //         }
  //       )
  //     })
  //   } else {
  //     const newProps: { isDraggingProgress: boolean; currentTimePos?: string } = {
  //       isDraggingProgress: false,
  //     }
  //     if (audio.readyState === audio.HAVE_NOTHING || audio.readyState === audio.HAVE_METADATA || !isFinite(newTime)) {
  //       try {
  //         audio.load()
  //       } catch (err) {
  //         newProps.currentTimePos = '0%'
  //         return onChangeCurrentTimeError && onChangeCurrentTimeError(err as Error)
  //       }
  //     }

  //     audio.currentTime = newTime
  //     this.setState(newProps)
  //   }

  //   if (event instanceof MouseEvent) {
  //     window.removeEventListener('mousemove', this.handleWindowMouseOrTouchMove)
  //     window.removeEventListener('mouseup', this.handleWindowMouseOrTouchUp)
  //   } else {
  //     window.removeEventListener('touchmove', this.handleWindowMouseOrTouchMove)
  //     window.removeEventListener('touchend', this.handleWindowMouseOrTouchUp)
  //   }
  // }

  // handleAudioTimeUpdate = throttle((e: Event): void => {
  //   const { isDraggingProgress } = this.state
  //   const audio = e.target as HTMLAudioElement
  //   if (isDraggingProgress || this.state.waitingForSeekCallback === true) return

  //   const { currentTime } = audio
  //   const duration = this.getDuration()

  //   this.setState({
  //     currentTimePos: `${((currentTime / duration) * 100 || 0).toFixed(2)}%`,
  //   })
  // }, this.props.progressUpdateInterval)

  // handleAudioDownloadProgressUpdate = (e: Event): void => {
  //   const audio = e.target as HTMLAudioElement
  //   const duration = this.getDuration()

  //   const downloadProgressArr: DownloadProgress[] = []
  //   for (let i = 0; i < audio.buffered.length; i++) {
  //     const bufferedStart: number = audio.buffered.start(i)
  //     const bufferedEnd: number = audio.buffered.end(i)
  //     downloadProgressArr.push({
  //       left: `${Math.round((100 / duration) * bufferedStart) || 0}%`,
  //       width: `${Math.round((100 / duration) * (bufferedEnd - bufferedStart)) || 0}%`,
  //     })
  //   }

  //   clearTimeout(this.downloadProgressAnimationTimer)
  //   this.setState({ downloadProgressArr, hasDownloadProgressAnimation: true })
  //   this.downloadProgressAnimationTimer = setTimeout(() => {
  //     this.setState({ hasDownloadProgressAnimation: false })
  //   }, 200)
  // }

  // initialize(): void {
  //   const { audio } = this.props
  //   if (audio && !this.hasAddedAudioEventListener) {
  //     this.audio = audio
  //     this.hasAddedAudioEventListener = true
  //     audio.addEventListener('timeupdate', this.handleAudioTimeUpdate)
  //     audio.addEventListener('progress', this.handleAudioDownloadProgressUpdate)
  //   }
  // }

  // componentDidMount(): void {
  //   this.initialize()
  // }

  // componentDidUpdate(): void {
  //   this.initialize()
  // }

  // componentWillUnmount(): void {
  //   if (this.audio && this.hasAddedAudioEventListener) {
  //     this.audio.removeEventListener('timeupdate', this.handleAudioTimeUpdate)
  //     this.audio.removeEventListener('progress', this.handleAudioDownloadProgressUpdate)
  //   }
  //   clearTimeout(this.downloadProgressAnimationTimer)
  // }

  audio?: HTMLAudioElement;
  hasAddedAudioEventListener = false;

  state: ProgressBarState = {
    currentTimePos: 0,
    isDragging: false,
    waitingForSeekCallback: false,
  };

  componentDidMount(): void {
    const { audio } = this.props;
    if (audio && !this.hasAddedAudioEventListener) {
      this.audio = audio;
      this.hasAddedAudioEventListener = true;
      audio.addEventListener('timeupdate', this.handleAudioTimeUpdate);
    }
  }

  componentWillUnmount(): void {
    if (this.audio && this.hasAddedAudioEventListener) {
      this.audio.removeEventListener('timeupdate', this.handleAudioTimeUpdate);
    }
  }

  handleAudioTimeUpdate = throttle((): void => {
    if (this.state.isDragging || this.state.waitingForSeekCallback) return;
    const { audio } = this.props;
    const currentTimePos = audio.currentTime / audio.duration;
    this.setState({ currentTimePos });
  }, this.props.progressUpdateInterval);

  handleMouseDown = (event: React.MouseEvent<SVGSVGElement>): void => {
    this.setState({ isDragging: true });
    this.handleMouseMove(event);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  };

  handleMouseMove = (event: MouseEvent | React.MouseEvent<SVGSVGElement>): void => {
    if (!this.state.isDragging) return;
    const { audio, progressBar } = this.props;
    if (!progressBar.current) return;

    const rect = progressBar.current.getBoundingClientRect();
    const x = 'clientX' in event ? event.clientX : (event as MouseEvent).clientX;
    let pos = (x - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos));

    this.setState({ currentTimePos: pos });
    audio.currentTime = audio.duration * pos;
  };

  handleMouseUp = (): void => {
    this.setState({ isDragging: false });
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  render(): React.ReactNode {
    // const { showDownloadProgress, showFilledProgress, i18nProgressBar, svg, strokeColor } = this.props
    // const { currentTimePos, downloadProgressArr, hasDownloadProgressAnimation } = this.state

    const { svg, strokeColor, i18nProgressBar } = this.props;
    const { currentTimePos } = this.state;

    // Clone the SVG element to add our own props
    const progressBar = React.cloneElement(svg, {
      ref: this.props.progressBar,
      role: "progressbar",
      'aria-label': i18nProgressBar,
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': Math.round(currentTimePos * 100),
      onMouseDown: this.handleMouseDown,
    });

    // Extract width and height from the SVG props
    const width = svg.props.width;
    const height = svg.props.height;

    return (
      <svg width={width} height={height}>
        <defs>
          <mask id="progress-mask">
            <rect x="0" y="0" width={width} height={height} fill="white" />
            <rect x="0" y="0" width={currentTimePos * width} height={height} fill="black" />
          </mask>
        </defs>

        {/* Render the original SVG as background */}
        {progressBar}

        {/* Render the filled part */}
        <svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
          {React.cloneElement(svg.props.children, {
            stroke: strokeColor,
            mask: "url(#progress-mask)"
          })}
        </svg>
      </svg>
    );

    // return (
    //   <div
    //     className="rhap_progress-container"
    //     ref={progressBar}
    //     aria-label={i18nProgressBar}
    //     role="progressbar"
    //     aria-valuemin={0}
    //     aria-valuemax={100}
    //     aria-valuenow={Number(currentTimePos.split('%')[0])}
    //     tabIndex={0}
    //     onMouseDown={this.handleMouseDownOrTouchStartProgressBar}
    //     onTouchStart={this.handleMouseDownOrTouchStartProgressBar}
    //     onContextMenu={this.handleContextMenu}
    //   >
    //     <div className={`rhap_progress-bar ${showDownloadProgress ? 'rhap_progress-bar-show-download' : ''}`}>
    //       <div className="rhap_progress-indicator" style={{ left: currentTimePos }} />
    //       {showFilledProgress && <div className="rhap_progress-filled" style={{ width: currentTimePos }} />}
    //       {showDownloadProgress &&
    //         downloadProgressArr.map(({ left, width }, i) => (
    //           <div
    //             key={i}
    //             className="rhap_download-progress"
    //             style={{ left, width, transitionDuration: hasDownloadProgressAnimation ? '.2s' : '0s' }}
    //           />
    //         ))}
    //     </div>
    //   </div>
    // )
  }
}

// const ProgressBarForwardRef = (
//   props: ProgressBarForwardRefProps,
//   ref: React.Ref<HTMLDivElement>
// ): React.ReactElement => <ProgressBar {...props} progressBar={ref as React.RefObject<HTMLDivElement>} />

// export default forwardRef(ProgressBarForwardRef)
// export { ProgressBar, ProgressBarForwardRef }

const ProgressBarForwardRef = forwardRef<SVGSVGElement, ProgressBarForwardRefProps>((props, ref) => (
  <ProgressBar {...props} progressBar={ref as React.RefObject<SVGSVGElement>} />
));

export default ProgressBarForwardRef;
export { ProgressBar, ProgressBarForwardRef };
