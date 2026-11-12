import { useEffect, useMemo, useState } from 'react';
import type { ExerciseCategory, ExerciseDef } from '../types';
import { useAppStore } from '../lib/store';
import {
  EXERCISE_CATEGORIES,
  allExercises,
  searchExercises,
} from '../lib/exercises';
import { Sheet } from './Sheet';
import { Icon } from './Icon';

interface ExercisePickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseDef) => void;
}

export function ExercisePickerSheet({ open, onClose, onSelect }: ExercisePickerSheetProps) {
  const customExercises = useAppStore((state) => state.customExercises);
  const addCustomExercise = useAppStore((state) => state.addCustomExercise);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExerciseCategory | '全部'>('全部');
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<ExerciseCategory>('其他');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCategory('全部');
    setCustomOpen(false);
    setCustomName('');
    setCustomCategory('其他');
  }, [open]);

  const exercises = useMemo(() => allExercises(customExercises), [customExercises]);
  const filtered = useMemo(
    () =>
      searchExercises(
        exercises,
        query,
        category === '全部' ? undefined : category,
      ),
    [exercises, query, category],
  );

  const groups = useMemo(() => {
    const map = new Map<ExerciseCategory, ExerciseDef[]>();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return EXERCISE_CATEGORIES.map((name) => ({
      name,
      items: map.get(name) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [filtered]);

  const select = (exercise: ExerciseDef) => {
    onSelect(exercise);
    onClose();
  };

  const createCustom = () => {
    const name = customName.trim();
    if (!name) return;
    const existing = exercises.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      select(existing);
      return;
    }
    const created = addCustomExercise(name, customCategory);
    select(created);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={customOpen ? '新建自定义动作' : '选择动作'}
      subtitle={customOpen ? '动作会保存到你的动作库' : '点选后加入当前计划或训练'}
      large
    >
      {customOpen ? (
        <div className="custom-exercise-form">
          <label className="field">
            <span>动作名称</span>
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="例如：史密斯机肩推"
              maxLength={24}
              autoFocus
            />
          </label>
          <div className="field">
            <span>分类</span>
            <div className="chip-row">
              {EXERCISE_CATEGORIES.map((item) => (
                <button
                  key={item}
                  className={`chip ${customCategory === item ? 'is-active' : ''}`}
                  type="button"
                  onClick={() => setCustomCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="button-row">
            <button className="btn btn--ghost" type="button" onClick={() => setCustomOpen(false)}>
              返回
            </button>
            <button
              className="btn btn--primary"
              type="button"
              onClick={createCustom}
              disabled={!customName.trim()}
            >
              添加并使用
            </button>
          </div>
        </div>
      ) : (
        <>
          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索动作"
              autoFocus
            />
          </label>
          <div className="chip-row category-scroll">
            <button
              className={`chip ${category === '全部' ? 'is-active' : ''}`}
              type="button"
              onClick={() => setCategory('全部')}
            >
              全部
            </button>
            {EXERCISE_CATEGORIES.map((item) => (
              <button
                key={item}
                className={`chip ${category === item ? 'is-active' : ''}`}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="exercise-list">
            {groups.map((group) => (
              <div key={group.name} className="exercise-group">
                <h4>{group.name}</h4>
                {group.items.map((exercise) => (
                  <button
                    key={exercise.id}
                    className="exercise-row"
                    type="button"
                    onClick={() => select(exercise)}
                  >
                    <span className="exercise-row__main">
                      <span className="exercise-row__name">{exercise.name}</span>
                      <span className="tag">{exercise.custom ? `${exercise.category} · 自建` : exercise.category}</span>
                    </span>
                    <Icon name="plus" size={18} />
                  </button>
                ))}
              </div>
            ))}
            {!groups.length && (
              <div className="list-empty">没有匹配的动作</div>
            )}
          </div>
          <button
            className="add-custom-link"
            type="button"
            onClick={() => {
              setCustomName(query.trim());
              setCustomCategory(category === '全部' ? '其他' : category);
              setCustomOpen(true);
            }}
          >
            <Icon name="plus" size={16} />
            新建自定义动作
          </button>
        </>
      )}
    </Sheet>
  );
}
