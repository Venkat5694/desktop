import * as React from 'react'
import { Dispatcher } from '../../lib/dispatcher'
import { OcticonSymbol } from '../octicons'
import { Repository } from '../../models/repository'
import { TipState } from '../../models/tip'
import { ToolbarDropdown, DropdownState } from './dropdown'
import { IRepositoryState } from '../../lib/app-state'
import { Branches } from '../branches'
import { assertNever } from '../../lib/fatal-error'
import { BranchesTab } from '../../models/branches-tab'
import { enablePreviewFeatures } from '../../lib/feature-flag'
import { PullRequest } from '../../models/pull-request'
import { PullRequestBadge } from '../branches/pull-request-badge'
import { PathText } from '../lib/path-text'

interface IBranchDropdownProps {
  readonly dispatcher: Dispatcher

  /** The currently selected repository. */
  readonly repository: Repository

  /** The current repository state as derived from AppState */
  readonly repositoryState: IRepositoryState

  /** Whether or not the branch dropdown is currently open */
  readonly isOpen: boolean

  /**
   * An event handler for when the drop down is opened, or closed, by a pointer
   * event or by pressing the space or enter key while focused.
   *
   * @param state    - The new state of the drop down
   */
  readonly onDropDownStateChanged: (state: DropdownState) => void

  /** The currently selected tab. */
  readonly selectedTab: BranchesTab

  /** The open pull requests in the repository. */
  readonly pullRequests: ReadonlyArray<PullRequest> | null

  /** The pull request associated with the current branch. */
  readonly currentPullRequest: PullRequest | null
}

/**
 * A drop down for selecting the currently checked out branch.
 */
export class BranchDropdown extends React.Component<IBranchDropdownProps> {
  private renderBranchFoldout = (): JSX.Element | null => {
    const repositoryState = this.props.repositoryState
    const branchesState = repositoryState.branchesState

    const tip = repositoryState.branchesState.tip
    const currentBranch = tip.kind === TipState.Valid ? tip.branch : null

    return (
      <Branches
        allBranches={branchesState.allBranches}
        recentBranches={branchesState.recentBranches}
        currentBranch={currentBranch}
        defaultBranch={branchesState.defaultBranch}
        dispatcher={this.props.dispatcher}
        repository={this.props.repository}
        selectedTab={this.props.selectedTab}
        pullRequests={this.props.pullRequests}
        currentPullRequest={this.props.currentPullRequest}
      />
    )
  }

  private onDropDownStateChanged = (state: DropdownState) => {
    // Don't allow opening the drop down when checkout is in progress
    if (state === 'open' && this.props.repositoryState.checkoutProgress) {
      return
    }

    this.props.onDropDownStateChanged(state)
  }

  public render() {
    const repositoryState = this.props.repositoryState
    const branchesState = repositoryState.branchesState
    const currentPullRequestState = this.props.currentPullRequest

    const tip = branchesState.tip
    const tipKind = tip.kind

    let icon = OcticonSymbol.gitBranch
    let iconClassName: string | undefined = undefined
    let title: string | JSX.Element
    let description = __DARWIN__ ? 'Current Branch' : 'Current branch'
    let canOpen = true
    let tooltip: string
    let canShowPRBadge = false
    let branchname: string | undefined

    if (currentPullRequestState) {
      icon = OcticonSymbol.gitPullRequest
    }

    if (tip.kind === TipState.Unknown) {
      // TODO: this is bad and I feel bad
      return null
    } else if (tip.kind === TipState.Unborn) {
      title = tip.ref
      branchname = tip.ref
      tooltip = `Current branch is ${tip.ref}`
      canOpen = false
    } else if (tip.kind === TipState.Detached) {
      title = `On ${tip.currentSha.substr(0, 7)}`
      tooltip = 'Currently on a detached HEAD'
      icon = OcticonSymbol.gitCommit
      description = 'Detached HEAD'
    } else if (tip.kind === TipState.Valid) {
      title = <PathText path={tip.branch.name} />
      branchname = tip.branch.name
      tooltip = `Current branch is ${tip.branch.name}`
    } else {
      return assertNever(tip, `Unknown tip state: ${tipKind}`)
    }

    const checkoutProgress = repositoryState.checkoutProgress
    let progressValue: number | undefined = undefined

    if (checkoutProgress) {
      title = <PathText path={checkoutProgress.targetBranch} />
      description = __DARWIN__ ? 'Switching to Branch' : 'Switching to branch'

      if (checkoutProgress.value > 0) {
        const friendlyProgress = Math.round(checkoutProgress.value * 100)
        description = `${description} (${friendlyProgress} %)`
      }

      progressValue = checkoutProgress.value
      icon = OcticonSymbol.sync
      iconClassName = 'spin'
      canOpen = false
    }

    if (
      branchname !== undefined &&
      currentPullRequestState &&
      branchname == currentPullRequestState.head.ref
    ) {
      canShowPRBadge = true
    }

    const isOpen = this.props.isOpen
    const currentState: DropdownState = isOpen && canOpen ? 'open' : 'closed'

    return (
      <ToolbarDropdown
        className="branch-button"
        icon={icon}
        iconClassName={iconClassName}
        title={title}
        description={description}
        tooltip={tooltip}
        onDropdownStateChanged={this.onDropDownStateChanged}
        dropdownContentRenderer={this.renderBranchFoldout}
        dropdownState={currentState}
        showDisclosureArrow={canOpen}
        progressValue={progressValue}
      >
      {canShowPRBadge ?
        this.renderPullRequestInfo() :
        null
      }

      </ToolbarDropdown>
    )
  }

  private renderPullRequestInfo() {
    const pr = this.props.currentPullRequest
    if (!pr) {
      return null
    }

    if (!enablePreviewFeatures()) {
      return null
    }

    return <PullRequestBadge number={pr.number} status={pr.status} />
  }
}
