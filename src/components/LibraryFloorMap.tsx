import React, { useMemo, useState, useEffect } from 'react';
import {
  MapPin,
  Layers,
  BookmarkCheck,
  Navigation,
  Search,
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen,
  Compass,
  Settings2,
  Plus,
  Trash2,
  Pencil,
  X,
  Building2,
} from 'lucide-react';
import {
  Book,
  BookCopy,
  FloorLayoutConfig,
  UserRole,
  WishlistItem,
} from '../types/database';
import { libraryRepository } from '../lib/supabase';

interface LibraryFloorMapProps {
  books: Book[];
  bookCopies: BookCopy[];
  activeStudentId: string;
  activeRole?: UserRole;
  wishlistItems?: WishlistItem[];
  highlightedCopyId?: string | null;
  onClearHighlight?: () => void;
  onDataRefresh?: () => Promise<void>;
}

interface EnrichedCopyLocation {
  copy: BookCopy;
  book?: Book;
  isMyReservation: boolean;
  isWishlistBook: boolean;
}

interface RackGroup {
  rackId: string;
  floor: string;
  copies: EnrichedCopyLocation[];
  availableCount: number;
  reservedCount: number;
  issuedCount: number;
  myReservedCopies: EnrichedCopyLocation[];
  myWishlistCopies: EnrichedCopyLocation[];
  shelves: string[];
}

export const LibraryFloorMap: React.FC<LibraryFloorMapProps> = ({
  books,
  bookCopies,
  activeStudentId,
  activeRole = 'STUDENT',
  wishlistItems = [],
  highlightedCopyId = null,
  onDataRefresh,
}) => {
  const canManageArchitecture =
    activeRole === 'ADMIN' || activeRole === 'LIBRARIAN';

  // Persisted Architectural Floor Layouts
  const [floorLayouts, setFloorLayouts] = useState<FloorLayoutConfig[]>(() =>
    libraryRepository.getFloorLayouts()
  );

  // Sync floor layouts if updated from another tab or action
  useEffect(() => {
    const syncLayouts = () => {
      setFloorLayouts(libraryRepository.getFloorLayouts());
    };
    window.addEventListener('mit-library-data-updated', syncLayouts);
    window.addEventListener('storage', syncLayouts);
    return () => {
      window.removeEventListener('mit-library-data-updated', syncLayouts);
      window.removeEventListener('storage', syncLayouts);
    };
  }, []);

  // Merge configured floors with any dynamic floor names present on bookCopies
  const allFloorsList = useMemo<FloorLayoutConfig[]>(() => {
    const map = new Map<string, FloorLayoutConfig>();
    floorLayouts.forEach((cfg) => {
      map.set(cfg.floor_name, cfg);
    });

    bookCopies.forEach((copy) => {
      if (copy.floor && !map.has(copy.floor)) {
        map.set(copy.floor, {
          id: `fl-dyn-${copy.floor}`,
          floor_name: copy.floor,
          wing_subtitle: 'MIT Academic Stack Wing',
          aisle_label: `Main Stack Corridor — ${copy.floor}`,
          gate_label: `QR ENTRANCE GATE (${copy.floor.toUpperCase()})`,
          desk_label: 'LIBRARIAN CIRCULATION DESK',
          study_zone_label: 'STUDENT SILENT READING ZONE',
          columns_per_row: 4,
          racks: ['Rack 1', 'Rack 2', 'Rack 3', 'Rack 4'],
        });
      }
    });

    return Array.from(map.values());
  }, [floorLayouts, bookCopies]);

  const [selectedFloor, setSelectedFloor] = useState<string>(
    allFloorsList[0]?.floor_name || 'Floor 1'
  );
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [onlyMyReserved, setOnlyMyReserved] = useState<boolean>(false);

  // Admin Floor & Map Architecture Editor Modal State
  const [architectModalOpen, setArchitectModalOpen] = useState<boolean>(false);
  const [architectMode, setArchitectMode] = useState<'EDIT_CURRENT' | 'ADD_NEW_FLOOR'>(
    'EDIT_CURRENT'
  );
  const [formFloorName, setFormFloorName] = useState<string>('');
  const [formWingSubtitle, setFormWingSubtitle] = useState<string>('');
  const [formAisleLabel, setFormAisleLabel] = useState<string>('');
  const [formGateLabel, setFormGateLabel] = useState<string>('');
  const [formDeskLabel, setFormDeskLabel] = useState<string>('');
  const [formStudyZoneLabel, setFormStudyZoneLabel] = useState<string>('');
  const [formColumnsPerRow, setFormColumnsPerRow] = useState<3 | 4>(4);
  const [formRacksList, setFormRacksList] = useState<string[]>([]);
  const [newRackInput, setNewRackInput] = useState<string>('');
  const [architectStatus, setArchitectStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Ensure selectedFloor stays valid if a floor is renamed or deleted
  useEffect(() => {
    if (
      allFloorsList.length > 0 &&
      !allFloorsList.some((f) => f.floor_name === selectedFloor)
    ) {
      setSelectedFloor(allFloorsList[0].floor_name);
    }
  }, [allFloorsList, selectedFloor]);

  const activeFloorConfig = useMemo<FloorLayoutConfig>(() => {
    return (
      allFloorsList.find((f) => f.floor_name === selectedFloor) ||
      allFloorsList[0] || {
        id: 'fl-default',
        floor_name: 'Floor 1',
        wing_subtitle: 'MIT Central Library Stack Wing',
        aisle_label: 'Main Stack Aisle — Floor 1',
        gate_label: 'QR ENTRANCE GATE',
        desk_label: 'LIBRARIAN CIRCULATION DESK',
        study_zone_label: 'STUDENT SILENT READING ZONE',
        columns_per_row: 4,
        racks: ['Rack 1', 'Rack 2', 'Rack 3', 'Rack 4'],
      }
    );
  }, [allFloorsList, selectedFloor]);

  const wishlistBookIds = useMemo(() => {
    return new Set(
      wishlistItems
        .filter((w) => w.user_id === activeStudentId)
        .map((w) => w.book_id)
    );
  }, [wishlistItems, activeStudentId]);

  const allEnrichedCopies = useMemo<EnrichedCopyLocation[]>(() => {
    return bookCopies.map((copy) => {
      const book = books.find((b) => b.id === copy.book_id);
      const isMyReservation =
        copy.status === 'RESERVED' &&
        Boolean(activeStudentId) &&
        copy.reserved_by_user_id === activeStudentId;
      const isWishlistBook = wishlistBookIds.has(copy.book_id);
      return {
        copy,
        book,
        isMyReservation,
        isWishlistBook,
      };
    });
  }, [bookCopies, books, activeStudentId, wishlistBookIds]);

  const myReservedLocations = useMemo(
    () => allEnrichedCopies.filter((item) => item.isMyReservation),
    [allEnrichedCopies]
  );

  // Automatically jump to floor & rack when highlightedCopyId changes
  useEffect(() => {
    if (highlightedCopyId) {
      const target = bookCopies.find((c) => c.id === highlightedCopyId);
      if (target) {
        setSelectedFloor(target.floor);
        setSelectedRackId(target.rack);
      }
    }
  }, [highlightedCopyId, bookCopies]);

  // Build racks for the selected floor combining Admin-configured racks + any racks holding books on this floor
  const racksOnFloor = useMemo<RackGroup[]>(() => {
    const floorCopies = allEnrichedCopies.filter(
      (item) => item.copy.floor === selectedFloor
    );

    const rackMap = new Map<string, EnrichedCopyLocation[]>();

    // Seed with Admin-configured racks for this floor
    activeFloorConfig.racks.forEach((r) => {
      rackMap.set(r, []);
    });

    // Also include any rack that currently holds physical book copies on this floor
    floorCopies.forEach((item) => {
      const rId = item.copy.rack || 'Rack 1';
      const existing = rackMap.get(rId) || [];
      existing.push(item);
      rackMap.set(rId, existing);
    });

    const q = searchFilter.trim().toLowerCase();

    return Array.from(rackMap.entries())
      .map(([rackId, copies]) => {
        const filteredCopies = copies.filter((entry) => {
          if (onlyMyReserved && !entry.isMyReservation) return false;
          if (!q) return true;
          return (
            entry.copy.accession_number.toLowerCase().includes(q) ||
            entry.copy.rack.toLowerCase().includes(q) ||
            entry.copy.shelf.toLowerCase().includes(q) ||
            (entry.book?.title || '').toLowerCase().includes(q) ||
            (entry.book?.author || '').toLowerCase().includes(q) ||
            (entry.book?.category || '').toLowerCase().includes(q)
          );
        });

        const availableCount = filteredCopies.filter(
          (c) => c.copy.status === 'AVAILABLE'
        ).length;
        const reservedCount = filteredCopies.filter(
          (c) => c.copy.status === 'RESERVED'
        ).length;
        const issuedCount = filteredCopies.filter(
          (c) => c.copy.status === 'ISSUED' || c.copy.status === 'OVERDUE'
        ).length;
        const myReservedCopies = filteredCopies.filter((c) => c.isMyReservation);
        const myWishlistCopies = filteredCopies.filter((c) => c.isWishlistBook);
        const shelves = Array.from(
          new Set(filteredCopies.map((c) => c.copy.shelf))
        ).sort();

        return {
          rackId,
          floor: selectedFloor,
          copies: filteredCopies,
          availableCount,
          reservedCount,
          issuedCount,
          myReservedCopies,
          myWishlistCopies,
          shelves,
        };
      })
      .sort((a, b) =>
        a.rackId.localeCompare(b.rackId, undefined, { numeric: true })
      );
  }, [allEnrichedCopies, selectedFloor, activeFloorConfig, searchFilter, onlyMyReserved]);

  const activeRack = useMemo<RackGroup | null>(() => {
    if (selectedRackId) {
      const found = racksOnFloor.find((r) => r.rackId === selectedRackId);
      if (found) return found;
    }
    const rackWithMyRes = racksOnFloor.find((r) => r.myReservedCopies.length > 0);
    if (rackWithMyRes) return rackWithMyRes;
    const rackWithBooks = racksOnFloor.find((r) => r.copies.length > 0);
    return rackWithBooks || racksOnFloor[0] || null;
  }, [racksOnFloor, selectedRackId]);

  const handleJumpToCopy = (copy: BookCopy) => {
    setSelectedFloor(copy.floor);
    setSelectedRackId(copy.rack);
  };

  // Dynamic SVG Blueprint Coordinates supporting 3-column or 4-column floor architecture & multiple rows
  const colsPerRow = activeFloorConfig.columns_per_row === 3 ? 3 : 4;
  const totalRows = Math.max(1, Math.ceil(racksOnFloor.length / colsPerRow));
  const svgHeight = Math.max(410, 195 + totalRows * 130);
  const gateY = svgHeight - 64;
  const aisleY = 205;

  const svgRackCoordinates = useMemo(() => {
    const rackWidth = colsPerRow === 3 ? 190 : 145;
    const colSpacing = colsPerRow === 3 ? 235 : 175;
    const startX = colsPerRow === 3 ? 72 : 62;

    return racksOnFloor.map((rack, index) => {
      const col = index % colsPerRow;
      const row = Math.floor(index / colsPerRow);
      const x = startX + col * colSpacing;
      const y = row === 0 ? 88 : 225 + (row - 1) * 116;
      return {
        rack,
        x,
        y,
        width: rackWidth,
        height: 96,
        centerX: x + rackWidth / 2,
        centerY: y + 48,
      };
    });
  }, [racksOnFloor, colsPerRow]);

  const activeRackSvgCoord = useMemo(() => {
    if (!activeRack) return null;
    return (
      svgRackCoordinates.find((c) => c.rack.rackId === activeRack.rackId) || null
    );
  }, [svgRackCoordinates, activeRack]);

  // Open Admin Architect Modal for Editing Current Floor
  const handleOpenEditCurrentFloor = () => {
    setArchitectStatus(null);
    setArchitectMode('EDIT_CURRENT');
    setFormFloorName(activeFloorConfig.floor_name);
    setFormWingSubtitle(activeFloorConfig.wing_subtitle);
    setFormAisleLabel(activeFloorConfig.aisle_label);
    setFormGateLabel(activeFloorConfig.gate_label);
    setFormDeskLabel(activeFloorConfig.desk_label);
    setFormStudyZoneLabel(activeFloorConfig.study_zone_label);
    setFormColumnsPerRow(activeFloorConfig.columns_per_row);
    setFormRacksList(
      racksOnFloor.map((r) => r.rackId).length > 0
        ? racksOnFloor.map((r) => r.rackId)
        : activeFloorConfig.racks
    );
    setNewRackInput('');
    setArchitectModalOpen(true);
  };

  // Open Admin Architect Modal for Adding a Brand New Floor
  const handleOpenAddNewFloor = () => {
    setArchitectStatus(null);
    setArchitectMode('ADD_NEW_FLOOR');
    const nextFloorNum = allFloorsList.length + 1;
    const suggestedName = `Floor ${nextFloorNum}`;
    setFormFloorName(suggestedName);
    setFormWingSubtitle(`New Academic & Reference Stack Wing (${suggestedName})`);
    setFormAisleLabel(`Main Stack Corridor — ${suggestedName}`);
    setFormGateLabel(`ENTRANCE / ELEVATOR GATE (${suggestedName.toUpperCase()})`);
    setFormDeskLabel('FLOOR CIRCULATION & HELP DESK');
    setFormStudyZoneLabel('STUDENT SILENT READING ZONE');
    setFormColumnsPerRow(4);
    setFormRacksList(['Rack 1', 'Rack 2', 'Rack 3', 'Rack 4']);
    setNewRackInput('');
    setArchitectModalOpen(true);
  };

  const handleAddRackToForm = () => {
    const trimmed = newRackInput.trim();
    if (!trimmed) return;
    if (!formRacksList.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setFormRacksList((prev) => [...prev, trimmed]);
    }
    setNewRackInput('');
  };

  const handleRemoveRackFromForm = (rackIdToRemove: string) => {
    if (formRacksList.length <= 1) return;
    setFormRacksList((prev) => prev.filter((r) => r !== rackIdToRemove));
  };

  const handleSaveFloorArchitecture = async (e: React.FormEvent) => {
    e.preventDefault();
    setArchitectStatus(null);

    try {
      const cleanedName = formFloorName.trim();
      if (!cleanedName) {
        setArchitectStatus({
          type: 'error',
          text: 'Please provide a valid Floor No. / Name (e.g., Floor 4, Ground Floor, Mezzanine).',
        });
        return;
      }

      if (architectMode === 'ADD_NEW_FLOOR') {
        const createdConfig: FloorLayoutConfig = {
          id: `fl-${Date.now()}`,
          floor_name: cleanedName,
          wing_subtitle: formWingSubtitle,
          aisle_label: formAisleLabel,
          gate_label: formGateLabel,
          desk_label: formDeskLabel,
          study_zone_label: formStudyZoneLabel,
          columns_per_row: formColumnsPerRow,
          racks: formRacksList.length > 0 ? formRacksList : ['Rack 1', 'Rack 2'],
        };
        const updated = libraryRepository.saveFloorLayout(createdConfig);
        setFloorLayouts(updated);
        setSelectedFloor(cleanedName);
        setSelectedRackId(null);
        if (onDataRefresh) await onDataRefresh();
        setArchitectModalOpen(false);
      } else {
        const updatedConfig: FloorLayoutConfig = {
          id: activeFloorConfig.id,
          floor_name: cleanedName,
          wing_subtitle: formWingSubtitle,
          aisle_label: formAisleLabel,
          gate_label: formGateLabel,
          desk_label: formDeskLabel,
          study_zone_label: formStudyZoneLabel,
          columns_per_row: formColumnsPerRow,
          racks: formRacksList.length > 0 ? formRacksList : ['Rack 1', 'Rack 2'],
        };
        const updated = await libraryRepository.renameFloorAcrossLibrary({
          floorId: activeFloorConfig.id,
          oldFloorName: activeFloorConfig.floor_name,
          updatedConfig,
        });
        setFloorLayouts(updated);
        setSelectedFloor(cleanedName);
        if (onDataRefresh) await onDataRefresh();
        setArchitectModalOpen(false);
      }
    } catch (err) {
      setArchitectStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save floor map changes.',
      });
    }
  };

  const handleDeleteCurrentFloor = async () => {
    setArchitectStatus(null);
    try {
      const updated = await libraryRepository.deleteFloorLayout({
        floorId: activeFloorConfig.id,
      });
      setFloorLayouts(updated);
      setSelectedFloor(updated[0]?.floor_name || 'Floor 1');
      setSelectedRackId(null);
      if (onDataRefresh) await onDataRefresh();
      setArchitectModalOpen(false);
    } catch (err) {
      setArchitectStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Cannot remove this floor.',
      });
    }
  };

  return (
    <div className="bg-white border border-[#E0F2FE] rounded-2xl overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 border-b border-[#E0F2FE] bg-[#F8FAFC] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Compass className="w-4 h-4 text-[#0284C7]" />
            <h2 className="text-base font-bold text-[#0F172A]">
              Interactive Library Floor & Rack Locator Map (Live SVG Stack Blueprint)
            </h2>
            {canManageArchitecture && (
              <span className="px-2 py-0.5 rounded bg-[#0F172A] text-white font-mono text-[10px] font-bold">
                ADMIN / LIBRARIAN MAP AUTHORITY
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            {activeFloorConfig.wing_subtitle} — Click any Rack ID on the SVG blueprint to inspect shelf locations and walking paths.
          </p>
        </div>

        {/* Floor Switcher, Admin Map Editor Buttons & Search Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Floor Selector */}
          <div className="inline-flex flex-wrap items-center p-1 bg-white border border-[#E0F2FE] rounded-xl gap-1">
            {allFloorsList.map((floorCfg) => {
              const floorName = floorCfg.floor_name;
              const resCountOnFloor = myReservedLocations.filter(
                (r) => r.copy.floor === floorName
              ).length;
              const isSelected = selectedFloor === floorName;
              return (
                <button
                  key={floorCfg.id}
                  type="button"
                  onClick={() => {
                    setSelectedFloor(floorName);
                    setSelectedRackId(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#0284C7] text-white'
                      : 'text-slate-600 hover:text-[#0F172A]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{floorName}</span>
                  {resCountOnFloor > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                        isSelected
                          ? 'bg-amber-300 text-slate-900'
                          : 'bg-amber-100 text-[#D97706]'
                      }`}
                    >
                      {resCountOnFloor} Reserved
                    </span>
                  )}
                </button>
              );
            })}

            {/* Admin Quick Button to Add a New Floor Anytime */}
            {canManageArchitecture && (
              <button
                type="button"
                onClick={handleOpenAddNewFloor}
                title="Add a new library floor to the interactive map"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F0F9FF] hover:bg-[#0284C7] text-[#0284C7] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Floor</span>
              </button>
            )}
          </div>

          {/* Admin Button to Customize Current Floor Name, Zones, Grid & Racks */}
          {canManageArchitecture && (
            <button
              type="button"
              onClick={handleOpenEditCurrentFloor}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Edit Floor & Map Layout</span>
            </button>
          )}

          {/* Search Rack / Title */}
          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Find Book, ACC-..., or Rack..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E0F2FE] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
            />
          </div>

          {/* Filter Only My Reserved Books */}
          <button
            type="button"
            onClick={() => setOnlyMyReserved((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              onlyMyReserved
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-slate-700 border-[#E0F2FE] hover:bg-[#F0F9FF]'
            }`}
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>My Reserved ({myReservedLocations.length})</span>
          </button>
        </div>
      </div>

      {/* Quick Jump Strip for Student's Reserved Items */}
      {myReservedLocations.length > 0 && (
        <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="w-4 h-4 text-[#D97706] shrink-0" />
            <span className="font-bold text-[#0F172A]">
              Quick-Locate Your Reserved Books:
            </span>
            <span className="text-slate-600 hidden sm:inline">
              Click a reservation badge below to trace the walking route on the SVG floor map:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {myReservedLocations.map(({ copy, book }) => {
              const isCurrent =
                selectedFloor === copy.floor &&
                activeRack?.rackId === copy.rack;
              return (
                <button
                  key={copy.id}
                  type="button"
                  onClick={() => handleJumpToCopy(copy)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#D97706] text-white border-[#D97706] shadow-xs'
                      : 'bg-white text-[#D97706] border-amber-300 hover:bg-amber-100/60'
                  }`}
                >
                  <Navigation className="w-3 h-3" />
                  <span>{copy.accession_number}</span>
                  <span>·</span>
                  <span>
                    {copy.floor} / {copy.rack} / {copy.shelf}
                  </span>
                  <span className="font-sans font-medium truncate max-w-[130px]">
                    ({book?.title})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Split View: SVG Architectural Floor Map + Selected Rack Shelf Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT 7 COLS: Interactive SVG Floor Map Blueprint */}
        <div className="lg:col-span-7 p-5 border-b lg:border-b-0 lg:border-r border-[#E0F2FE] bg-[#F8FAFC]/60 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-[#0284C7] text-white text-xs font-mono font-bold">
                  {selectedFloor.toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {activeFloorConfig.wing_subtitle}
                </span>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                  Your Reserved Item
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                  Available Stock
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
                  Selected Rack
                </span>
              </div>
            </div>

            {/* Interactive SVG Map */}
            <div className="w-full rounded-2xl border border-[#E0F2FE] bg-white p-2 shadow-2xs overflow-x-auto">
              <svg
                viewBox={`0 0 800 ${svgHeight}`}
                className="w-full h-auto min-w-[540px] select-none"
                role="img"
                aria-label={`Interactive SVG floor map for ${selectedFloor}`}
              >
                <defs>
                  <pattern
                    id="blueprintGrid"
                    width="25"
                    height="25"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 25 0 L 0 0 0 25"
                      fill="none"
                      stroke="#E0F2FE"
                      strokeWidth="0.8"
                    />
                  </pattern>
                </defs>

                {/* Floor Blueprint Background */}
                <rect
                  x="12"
                  y="12"
                  width="776"
                  height={svgHeight - 24}
                  rx="16"
                  fill="url(#blueprintGrid)"
                  stroke="#BAE6FD"
                  strokeWidth="2"
                />

                {/* Top Architectural Zone Bar: Librarian Circulation Desk */}
                <rect
                  x="32"
                  y="24"
                  width="250"
                  height="42"
                  rx="8"
                  fill="#F0F9FF"
                  stroke="#7DD3FC"
                  strokeWidth="1.5"
                />
                <text
                  x="157"
                  y="43"
                  textAnchor="middle"
                  className="text-[11px] font-bold fill-[#0284C7]"
                >
                  {activeFloorConfig.desk_label.toUpperCase()}
                </text>
                <text
                  x="157"
                  y="57"
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-slate-500"
                >
                  Issue · Return · 24h Pickup Counter
                </text>

                {/* Quiet Study Bay Top-Right */}
                <rect
                  x="500"
                  y="24"
                  width="266"
                  height="42"
                  rx="8"
                  fill="#F8FAFC"
                  stroke="#CBD5E1"
                  strokeWidth="1.2"
                />
                <text
                  x="633"
                  y="43"
                  textAnchor="middle"
                  className="text-[11px] font-bold fill-slate-700"
                >
                  {activeFloorConfig.study_zone_label.toUpperCase()}
                </text>
                <text
                  x="633"
                  y="57"
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-slate-500"
                >
                  Reference Tables & Digital Terminals
                </text>

                {/* Central Walking Corridor Label */}
                <line
                  x1="40"
                  y1={aisleY}
                  x2="760"
                  y2={aisleY}
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                  strokeDasharray="6 6"
                />
                <text
                  x="400"
                  y={aisleY - 5}
                  textAnchor="middle"
                  className="text-[9px] font-mono uppercase tracking-widest fill-slate-400"
                >
                  {activeFloorConfig.aisle_label}
                </text>

                {/* Bottom QR Entrance Gate */}
                <g transform={`translate(290, ${gateY})`}>
                  <rect
                    x="0"
                    y="0"
                    width="220"
                    height="42"
                    rx="10"
                    fill="#0F172A"
                  />
                  <circle cx="22" cy="21" r="6" fill="#38BDF8" />
                  <text
                    x="116"
                    y="19"
                    textAnchor="middle"
                    className="text-[10.5px] font-bold fill-white"
                  >
                    {activeFloorConfig.gate_label.toUpperCase()}
                  </text>
                  <text
                    x="116"
                    y="33"
                    textAnchor="middle"
                    className="text-[9px] font-mono fill-sky-300"
                  >
                    YOU ARE HERE (START PATH)
                  </text>
                </g>

                {/* Animated Walking Path from QR Entrance Gate to Active Rack */}
                {activeRackSvgCoord && (
                  <g>
                    <path
                      d={`M 400 ${gateY} L 400 ${aisleY} L ${activeRackSvgCoord.centerX} ${aisleY} L ${activeRackSvgCoord.centerX} ${
                        activeRackSvgCoord.y + activeRackSvgCoord.height
                      }`}
                      fill="none"
                      stroke={
                        activeRackSvgCoord.rack.myReservedCopies.length > 0
                          ? '#D97706'
                          : '#0284C7'
                      }
                      strokeWidth="3"
                      strokeDasharray="7 5"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={activeRackSvgCoord.centerX}
                      cy={activeRackSvgCoord.y + activeRackSvgCoord.height}
                      r="5"
                      fill={
                        activeRackSvgCoord.rack.myReservedCopies.length > 0
                          ? '#D97706'
                          : '#0284C7'
                      }
                    />
                  </g>
                )}

                {/* Render Each Interactive Rack Unit */}
                {svgRackCoordinates.map(
                  ({ rack, x, y, width, height, centerX }) => {
                    const isSelected = activeRack?.rackId === rack.rackId;
                    const hasMyReservation = rack.myReservedCopies.length > 0;
                    const hasAvailable = rack.availableCount > 0;

                    const fillBg = hasMyReservation
                      ? isSelected
                        ? '#FEF3C7'
                        : '#FFFBEB'
                      : isSelected
                      ? '#E0F2FE'
                      : '#FFFFFF';

                    const strokeColor = hasMyReservation
                      ? '#D97706'
                      : isSelected
                      ? '#0284C7'
                      : hasAvailable
                      ? '#10B981'
                      : '#CBD5E1';

                    return (
                      <g
                        key={rack.rackId}
                        transform={`translate(${x}, ${y})`}
                        onClick={() => setSelectedRackId(rack.rackId)}
                        className="cursor-pointer transition-opacity hover:opacity-95"
                      >
                        {/* Outer Rack Frame */}
                        <rect
                          x="0"
                          y="0"
                          width={width}
                          height={height}
                          rx="12"
                          fill={fillBg}
                          stroke={strokeColor}
                          strokeWidth={isSelected || hasMyReservation ? '2.5' : '1.5'}
                        />

                        {/* Visual Shelf Dividers inside the SVG Rack */}
                        <line
                          x1="10"
                          y1="32"
                          x2={width - 10}
                          y2="32"
                          stroke="#E2E8F0"
                          strokeWidth="1"
                        />
                        <line
                          x1="10"
                          y1="64"
                          x2={width - 10}
                          y2="64"
                          stroke="#E2E8F0"
                          strokeWidth="1"
                        />

                        {/* Rack ID Title */}
                        <text
                          x="12"
                          y="21"
                          className="text-[12px] font-mono font-bold fill-[#0F172A]"
                        >
                          {rack.rackId}
                        </text>

                        {/* Total Copies Pill */}
                        <text
                          x={width - 12}
                          y="20"
                          textAnchor="end"
                          className="text-[10px] font-mono font-semibold fill-slate-500"
                        >
                          {rack.copies.length}{' '}
                          {rack.copies.length === 1 ? 'Copy' : 'Copies'}
                        </text>

                        {/* Middle Shelf Status Row */}
                        <text
                          x="12"
                          y="51"
                          className="text-[10px] font-mono font-semibold fill-[#059669]"
                        >
                          {rack.availableCount} Avail
                        </text>
                        <text
                          x={width - 12}
                          y="51"
                          textAnchor="end"
                          className="text-[10px] font-mono font-semibold fill-[#0284C7]"
                        >
                          {rack.issuedCount} Issued
                        </text>

                        {/* Bottom Shelf Row: Reserved Pin or Shelf Names */}
                        {hasMyReservation ? (
                          <g transform="translate(10, 71)">
                            <rect
                              x="0"
                              y="0"
                              width={width - 20}
                              height="20"
                              rx="5"
                              fill="#D97706"
                            />
                            <text
                              x={(width - 20) / 2}
                              y="13.5"
                              textAnchor="middle"
                              className="text-[9.5px] font-mono font-bold fill-white"
                            >
                              ★ {rack.myReservedCopies.length} RESERVED HERE
                            </text>
                          </g>
                        ) : (
                          <text
                            x="12"
                            y="84"
                            className="text-[10px] font-mono fill-slate-500"
                          >
                            {rack.shelves.length > 0
                              ? rack.shelves.join(', ')
                              : 'Ready Rack'}
                          </text>
                        )}

                        {/* Floating Pin if student has a reserved copy on this rack */}
                        {hasMyReservation && (
                          <g transform={`translate(${centerX - x}, -10)`}>
                            <circle
                              cx="0"
                              cy="0"
                              r="9"
                              fill="#D97706"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                            />
                            <text
                              x="0"
                              y="3.5"
                              textAnchor="middle"
                              className="text-[9px] font-mono font-bold fill-white"
                            >
                              {rack.myReservedCopies.length}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  }
                )}
              </svg>
            </div>
          </div>

          {/* Bottom Navigation Tip */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              <strong>Dashed Line:</strong> Direct walking path from{' '}
              <span className="font-mono text-[#0F172A]">
                {activeFloorConfig.gate_label}
              </span>{' '}
              to{' '}
              <span className="font-mono font-semibold text-[#0284C7]">
                {selectedFloor} · {activeRack?.rackId || 'Rack'}
              </span>
            </span>
            {canManageArchitecture && (
              <button
                type="button"
                onClick={handleOpenEditCurrentFloor}
                className="inline-flex items-center gap-1 font-semibold text-[#0284C7] hover:underline cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                Customize {selectedFloor} Blueprint
              </button>
            )}
          </div>
        </div>

        {/* RIGHT 5 COLS: Selected Rack Shelf-by-Shelf Breakdown */}
        <div className="lg:col-span-5 p-5 bg-white flex flex-col justify-between">
          {activeRack ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-[#E0F2FE] pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#F0F9FF] border border-[#E0F2FE] font-mono text-xs font-bold text-[#0284C7]">
                      {activeRack.floor} · {activeRack.rackId}
                    </span>
                    {activeRack.myReservedCopies.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-100 border border-amber-300 font-mono text-[11px] font-bold text-[#D97706]">
                        {activeRack.myReservedCopies.length} Reserved Pickup
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[#0F172A] mt-1.5">
                    Physical Books Located at {activeRack.rackId}
                  </h3>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="font-bold text-[#059669]">
                    {activeRack.availableCount} Avail
                  </span>
                  <span className="text-slate-300 mx-1">·</span>
                  <span className="font-bold text-[#D97706]">
                    {activeRack.reservedCount} Hold
                  </span>
                </div>
              </div>

              {activeRack.copies.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-[#F8FAFC] border border-[#E0F2FE]">
                  <BookOpen className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#0F172A]">
                    No Books Assigned to {activeRack.floor} · {activeRack.rackId} Yet
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Select another rack on the SVG map or assign book copies to {activeRack.floor} · {activeRack.rackId} in the Librarian Desk.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {activeRack.copies.map(({ copy, book, isMyReservation, isWishlistBook }) => {
                    const isHighlighted = highlightedCopyId === copy.id;
                    return (
                      <div
                        key={copy.id}
                        className={`p-3.5 rounded-xl border transition-colors ${
                          isMyReservation || isHighlighted
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-[#F8FAFC] border-[#E0F2FE] hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[#0284C7]">
                            {copy.accession_number}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isMyReservation && (
                              <span className="px-2 py-0.5 rounded bg-[#D97706] text-white font-mono text-[10px] font-bold">
                                YOUR RESERVATION
                              </span>
                            )}
                            {isWishlistBook && !isMyReservation && (
                              <span className="px-2 py-0.5 rounded bg-sky-100 text-[#0284C7] font-mono text-[10px] font-semibold">
                                WISHLIST
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold border ${
                                copy.status === 'AVAILABLE'
                                  ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                                  : copy.status === 'RESERVED'
                                  ? 'bg-amber-50 text-[#D97706] border-amber-200'
                                  : 'bg-[#F0F9FF] text-[#0284C7] border-[#E0F2FE]'
                              }`}
                            >
                              {copy.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs font-bold text-[#0F172A] mt-1">
                          {book?.title || 'Academic Volume'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {book?.author} · {book?.category}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-[#E0F2FE] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="inline-flex items-center gap-1 font-semibold text-[#0F172A]">
                            <MapPin className="w-3.5 h-3.5 text-[#0284C7]" />
                            {copy.floor} → {copy.rack} →{' '}
                            <span className="px-1.5 py-0.5 rounded bg-[#0284C7] text-white">
                              {copy.shelf}
                            </span>
                          </span>

                          {copy.reserved_for_date && (
                            <span className="inline-flex items-center gap-1 text-[#D97706] font-semibold">
                              <Clock className="w-3 h-3" />
                              Pickup:{' '}
                              {new Date(copy.reserved_for_date).toLocaleDateString(
                                'en-IN'
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-4 pt-3 border-t border-[#E0F2FE] flex items-center justify-between text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
              {allFloorsList.length} Active Library Floors
            </span>
            <span className="font-mono">
              {bookCopies.length} Total Copies Mapped
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ADMIN / LIBRARIAN FLOOR & INTERACTIVE MAP ARCHITECTURE MODAL
      ===================================================================== */}
      {architectModalOpen && canManageArchitecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#E0F2FE] shadow-xl overflow-hidden my-8">
            <div className="bg-[#0F172A] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-[#38BDF8]" />
                <div>
                  <h3 className="text-base font-bold">
                    {architectMode === 'ADD_NEW_FLOOR'
                      ? 'Add New Library Floor & Configure SVG Map'
                      : `Customize Interactive Floor Map — ${activeFloorConfig.floor_name}`}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Admin authority to rename Floor No., add new floors, customize SVG zone labels, and add/remove Rack IDs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setArchitectModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFloorArchitecture} className="p-6 space-y-4">
              {architectStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium ${
                    architectStatus.type === 'error'
                      ? 'bg-red-50 border-red-200 text-[#DC2626]'
                      : 'bg-emerald-50 border-emerald-200 text-[#059669]'
                  }`}
                >
                  {architectStatus.text}
                </div>
              )}

              {/* Mode Switcher inside Modal */}
              <div className="flex items-center gap-2 p-1 bg-[#F8FAFC] border border-[#E0F2FE] rounded-xl">
                <button
                  type="button"
                  onClick={handleOpenEditCurrentFloor}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    architectMode === 'EDIT_CURRENT'
                      ? 'bg-[#0284C7] text-white'
                      : 'text-slate-600 hover:text-[#0F172A]'
                  }`}
                >
                  Edit Current Floor ({activeFloorConfig.floor_name})
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddNewFloor}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    architectMode === 'ADD_NEW_FLOOR'
                      ? 'bg-[#0284C7] text-white'
                      : 'text-slate-600 hover:text-[#0F172A]'
                  }`}
                >
                  + Add Brand New Floor
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Floor No. / Floor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formFloorName}
                    onChange={(e) => setFormFloorName(e.target.value)}
                    placeholder="e.g., Floor 4, Ground Floor, Mezzanine"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E0F2FE] text-xs font-mono font-semibold text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                  />
                  {architectMode === 'EDIT_CURRENT' &&
                    formFloorName.trim() !== activeFloorConfig.floor_name && (
                      <p className="text-[11px] text-[#0284C7] mt-1">
                        Renaming will automatically update all book copies currently on{' '}
                        <strong>{activeFloorConfig.floor_name}</strong> to{' '}
                        <strong>{formFloorName.trim()}</strong>.
                      </p>
                    )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    SVG Rack Grid Layout (Columns per Row)
                  </label>
                  <select
                    value={formColumnsPerRow}
                    onChange={(e) =>
                      setFormColumnsPerRow(Number(e.target.value) === 3 ? 3 : 4)
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[#E0F2FE] text-xs font-semibold text-[#0F172A] bg-white focus:outline-none focus:border-[#0284C7]"
                  >
                    <option value={4}>4 Racks Per Row (Standard Wide Blueprint)</option>
                    <option value={3}>3 Racks Per Row (Spacious Reading Layout)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Floor Wing / Academic Department Subtitle
                </label>
                <input
                  type="text"
                  value={formWingSubtitle}
                  onChange={(e) => setFormWingSubtitle(e.target.value)}
                  placeholder="e.g., Postgraduate Research, Robotics & Cybernetics Wing"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E0F2FE] text-xs text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                />
              </div>

              {/* Architectural Landmarks on SVG Blueprint */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Entrance / Gate Label (Bottom SVG Node)
                  </label>
                  <input
                    type="text"
                    value={formGateLabel}
                    onChange={(e) => setFormGateLabel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E0F2FE] text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Main Corridor / Aisle Label
                  </label>
                  <input
                    type="text"
                    value={formAisleLabel}
                    onChange={(e) => setFormAisleLabel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E0F2FE] text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Left Counter / Desk Zone Label
                  </label>
                  <input
                    type="text"
                    value={formDeskLabel}
                    onChange={(e) => setFormDeskLabel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E0F2FE] text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Right Reading / Study Zone Label
                  </label>
                  <input
                    type="text"
                    value={formStudyZoneLabel}
                    onChange={(e) => setFormStudyZoneLabel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#E0F2FE] text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                  />
                </div>
              </div>

              {/* Manage Rack IDs on this Floor */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E0F2FE] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0F172A]">
                    Rack IDs Displayed on {formFloorName || 'This Floor'} ({formRacksList.length} Racks)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Add or remove physical racks on the SVG blueprint
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {formRacksList.map((rId) => (
                    <span
                      key={rId}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#E0F2FE] text-xs font-mono font-bold text-[#0284C7]"
                    >
                      <span>{rId}</span>
                      {formRacksList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRackFromForm(rId)}
                          className="text-slate-400 hover:text-[#DC2626] cursor-pointer"
                          title={`Remove ${rId} from blueprint`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newRackInput}
                    onChange={(e) => setNewRackInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRackToForm();
                      }
                    }}
                    placeholder="Add Rack ID (e.g., Rack 7, Rack 8, Reference Rack A)..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-[#E0F2FE] text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#0284C7]"
                  />
                  <button
                    type="button"
                    onClick={handleAddRackToForm}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Rack to Map
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-[#E0F2FE] flex flex-wrap items-center justify-between gap-3">
                {architectMode === 'EDIT_CURRENT' && allFloorsList.length > 1 ? (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentFloor}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border border-red-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Floor ({activeFloorConfig.floor_name})
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setArchitectModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E0F2FE] text-xs font-semibold text-slate-600 hover:bg-[#F8FAFC] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {architectMode === 'ADD_NEW_FLOOR'
                      ? 'Create New Floor & Update Map'
                      : 'Save Floor & Map Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
