import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useGame } from './useGame';
import StartScreen from './StartScreen';
import GameScreen from './GameScreen';

function BoardPage() {
  useDocumentTitle('Board');
  const game = useGame();

  if (game.status === 'start' || !game.state) {
    return <StartScreen onStart={game.start} corruptNotice={game.corruptNotice} />;
  }

  return (
    <GameScreen
      state={game.state}
      canUndo={game.canUndo}
      undoLabel={game.undoLabel}
      onScore={game.scoreTrack}
      onNextDeal={game.goNextDeal}
      onSetDealer={game.changeDealer}
      onUndo={game.undoLast}
      onNewGame={game.resetToStart}
    />
  );
}

export default BoardPage;
