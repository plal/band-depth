(module
  (type (;0;) (func))
  (type (;1;) (func (param f32) (result f32)))
  (type (;2;) (func (param i32)))
  (type (;3;) (func (result i32)))
  (type (;4;) (func (param i32) (result i32)))
  (type (;5;) (func (param i32 i32) (result i32)))
  (func (;0;) (type 0)
    nop)
  (func (;1;) (type 0)
    i32.const 1024
    i32.const 66576
    i32.load
    i32.const 4
    i32.add
    i32.store)
  (func (;2;) (type 3) (result i32)
    i32.const 1024
    i32.load)
  (func (;3;) (type 2) (param i32)
    i32.const 1024
    local.get 0
    i32.store)
  (func (;4;) (type 4) (param i32) (result i32)
    (local i32)
    i32.const 1024
    i32.const 1024
    i32.load
    local.tee 1
    local.get 0
    i32.const 3
    i32.add
    i32.const 4
    i32.div_s
    i32.const 2
    i32.shl
    i32.add
    i32.store
    local.get 1)
  (func (;5;) (type 5) (param i32 i32) (result i32)
    (local i32)
    local.get 1
    i32.const 1
    i32.ge_s
    if  ;; label = @1
      loop  ;; label = @2
        local.get 0
        i32.load
        local.get 2
        i32.add
        local.set 2
        local.get 0
        i32.const 4
        i32.add
        local.set 0
        local.get 1
        i32.const -1
        i32.add
        local.tee 1
        br_if 0 (;@2;)
      end
    end
    local.get 2)
  (func (;6;) (type 1) (param f32) (result f32)
    (local i32 i32 f32 f32)
    block  ;; label = @1
      block  ;; label = @2
        local.get 0
        i32.reinterpret_f32
        local.tee 1
        i32.const 8388608
        i32.ge_u
        i32.const 0
        local.get 1
        i32.const -1
        i32.gt_s
        select
        i32.eqz
        if  ;; label = @3
          local.get 1
          i32.const 2147483647
          i32.and
          i32.eqz
          if  ;; label = @4
            f32.const -0x1p+0 (;=-1;)
            local.get 0
            local.get 0
            f32.mul
            f32.div
            return
          end
          local.get 1
          i32.const -1
          i32.le_s
          if  ;; label = @4
            local.get 0
            local.get 0
            f32.sub
            f32.const 0x0p+0 (;=0;)
            f32.div
            return
          end
          local.get 0
          f32.const 0x1p+25 (;=3.35544e+07;)
          f32.mul
          i32.reinterpret_f32
          local.set 1
          i32.const -152
          local.set 2
          br 1 (;@2;)
        end
        local.get 1
        i32.const 2139095039
        i32.gt_u
        br_if 1 (;@1;)
        i32.const -127
        local.set 2
        f32.const 0x0p+0 (;=0;)
        local.set 0
        local.get 1
        i32.const 1065353216
        i32.eq
        br_if 1 (;@1;)
      end
      local.get 2
      local.get 1
      i32.const 4913933
      i32.add
      local.tee 1
      i32.const 23
      i32.shr_u
      i32.add
      f32.convert_i32_s
      local.tee 3
      f32.const 0x1.62e3p-1 (;=0.693138;)
      f32.mul
      local.get 1
      i32.const 8388607
      i32.and
      i32.const 1060439283
      i32.add
      f32.reinterpret_i32
      f32.const -0x1p+0 (;=-1;)
      f32.add
      local.tee 0
      local.get 3
      f32.const 0x1.2fefa2p-17 (;=9.058e-06;)
      f32.mul
      local.get 0
      local.get 0
      f32.const 0x1p+1 (;=2;)
      f32.add
      f32.div
      local.tee 3
      local.get 0
      local.get 0
      f32.const 0x1p-1 (;=0.5;)
      f32.mul
      f32.mul
      local.tee 4
      local.get 3
      local.get 3
      f32.mul
      local.tee 0
      local.get 0
      local.get 0
      f32.mul
      local.tee 0
      f32.const 0x1.23d3dcp-2 (;=0.284988;)
      f32.mul
      f32.const 0x1.555554p-1 (;=0.666667;)
      f32.add
      f32.mul
      local.get 0
      local.get 0
      f32.const 0x1.f13c4cp-3 (;=0.242791;)
      f32.mul
      f32.const 0x1.999c26p-2 (;=0.40001;)
      f32.add
      f32.mul
      f32.add
      f32.add
      f32.mul
      f32.add
      local.get 4
      f32.sub
      f32.add
      f32.add
      local.set 0
    end
    local.get 0)
  (func (;7;) (type 1) (param f32) (result f32)
    local.get 0
    call 6)
  (memory (;0;) 2)
  (global (;0;) i32 (i32.const 66576))
  (global (;1;) i32 (i32.const 1024))
  (global (;2;) i32 (i32.const 1028))
  (global (;3;) i32 (i32.const 1024))
  (global (;4;) i32 (i32.const 0))
  (global (;5;) i32 (i32.const 1))
  (export "memory" (memory 0))
  (export "__wasm_call_ctors" (func 0))
  (export "rans_init" (func 1))
  (export "rans_mem_get_checkpoint" (func 2))
  (export "rans_mem_set_checkpoint" (func 3))
  (export "rans_malloc" (func 4))
  (export "rans_sum" (func 5))
  (export "logf" (func 6))
  (export "rans_log" (func 7))
  (export "__heap_base" (global 0))
  (export "__dso_handle" (global 1))
  (export "__data_end" (global 2))
  (export "__global_base" (global 3))
  (export "__memory_base" (global 4))
  (export "__table_base" (global 5)))
