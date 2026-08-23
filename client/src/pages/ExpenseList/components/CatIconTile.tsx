interface CatIconTileProps {
  emoji: string;
  kind: 'income' | 'expense';
}

export function CatIconTile({ emoji, kind }: CatIconTileProps) {
  return (
    <div className={`expense-cat-tile expense-cat-tile--${kind}`}>
      {emoji}
    </div>
  );
}
