export function Transaction(props) {


  const Approval = () => {
    return (
      <div>
        <span>Initializing<br /><small>Waiting for transaction approval.</small></span>
        <progress indeterminate="true">Initializing...</progress>
      </div>
    )
  }

  const Pending = () => {
    return (
      <div>
        <span className="txId">
          <a href={`https://flowscan.org/transaction/${props.txId}`}>{props.txId?.slice(0, 8)}</a>
        </span>
        <span>Pending<br /><small>The transaction has been received by a collector but not yet finalized in a block.</small></span>
        <progress indeterminate="true">Executing</progress>
      </div>
    )
  }

  const Finalized = () => {
    return (
      <div>
        <span className="txId">
          <a href={`https://flowscan.org/transaction/${props.txId}`}>{props.txId?.slice(0, 8)}</a>
        </span>
        <span>Finalized<br /><small>The consensus nodes have finalized the block that the transaction is included in.</small></span>
        <progress min="0" max="100" value="80">Executing...</progress>
      </div>
    )
  }


  const Executed = () => {
    return (
      <div>
        <span className="txId">
          <a href={`https://flowscan.org/transaction/${props.txId}`}>{props.txId?.slice(0, 8)}</a>
        </span>
        <span>Executed<br /><small>	The execution nodes have produced a result for the transaction.</small></span>
        <progress min="0" max="100" value="80">Sealing...</progress>
      </div>
    )
  }

  const Sealed = () => {
    return (
      <div>
        <span className="txId">
          <a href={`https://flowscan.org/transaction/${props.txId}`}>{props.txId?.slice(0, 8)}</a>
        </span>
        <span>Sealed<br /><small>The verification nodes have verified the transaction, and the seal is included in the latest block.</small></span>
        <span className="txError"><br /><small>{props.transactionError}</small></span>
        <progress min="0" max="100" value="100">Sealed!</progress>
      </div>
    )
  }


  const Expired = () => {
    return (
      <div>
        <span className="txId">
          <a href={`https://flowscan.org/transaction/${props.txId}`}>{props.txId?.slice(0, 8)}</a>
        </span>
        <span>Expired<br /><small>The transaction was submitted past its expiration block height.</small></span>
      </div>
    )
  }


  const Error = () => {
    return (
      <div>
        <span className="txId">
          <a href={`https://flowscan.org/transaction/${props.txId}`}>{props.txId?.slice(0, 8)}</a>
        </span>
        <span data-theme="invalid">Error!</span>
      </div>
    )
  }

  let response;

  if (props.transactionStatus < 0) {
    response = <Approval />
  } else if (props.transactionStatus < 2) {
    response = <Pending />
  } else if (props.transactionStatus === 2) {
    response = <Finalized />
  } else if (props.transactionStatus === 3) {
    response = <Executed />
  } else if (props.transactionStatus === 4) {
    response = <Sealed />
  } else if (props.transactionStatus === 5) {
    response = <Expired />
  } else {
    response = <Error />
  }

  return (
    <div className="card tx">
      {response}
      <small><a onClick={props.hideTx}>Clear</a></small>
    </div>
  )
}
