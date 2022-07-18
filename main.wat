(module
  (import
    "wasi_unstable"
    "fd_write"
    (func
      $fd_write
      (param
        i32
        i32
        i32
        i32
      )
      (result i32)
    )
  )
  (memory $mem 1)
  (export
    "memory"
    (memory 0)
  )
  (global
    $mem_max_addr
    (mut i32)
    (i32.const 65536)
  )
  (global
    $mem_next_free
    (mut i32)
    (i32.const 0)
  )
  (func
    $mem_alloc
    (param $bytes i32)
    (result i32)
    (local $_result i32)
    (if
      (i32.lt_u
        (i32.sub
          (global.get $mem_max_addr)
          (global.get $mem_next_free)
        )
        (local.get $bytes)
      )
      (then
        (memory.grow
          (i32.div_u
            (i32.add
              (local.get $bytes)
              (i32.const 65527)
            )
            (i32.const 65528)
          )
        )
        (drop)
        (global.set
          $mem_max_addr
          (i32.add
            (global.get $mem_max_addr)
            (local.get $bytes)
          )
        )
      )
    )
    (local.set
      $_result
      (global.get $mem_next_free)
    )
    (global.set
      $mem_next_free
      (i32.add
        (local.get $bytes)
        (global.get $mem_next_free)
      )
    )
    (local.get $_result)
  )
  (func
    $Cons
    (param $param0 i32)
    (param $param1 i32)
    (result i32)
    (local $struct_start_address i32)
    (i32.const 12)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 4)
      )
      (local.get $param0)
    )
    (i32.store
      (i32.add
        (local.get $struct_start_address)
        (i32.const 8)
      )
      (local.get $param1)
    )
    (local.get $struct_start_address)
  )
  (func
    $Nil
    (result i32)
    (local $struct_start_address i32)
    (i32.const 4)
    (call $mem_alloc)
    (local.set $struct_start_address)
    (i32.store
      (local.get $struct_start_address)
      (i32.const 1)
    )
    (local.get $struct_start_address)
  )
  (func
    $_start
    (result i32)
    (local $val i32)
    (local $var_20978 i32)
    (local $a i32)
    (local $b i32)
    (i32.const 2)
    (call $Nil)
    (call $Cons)
    (local.set $val)
    (local.set
      $var_20978
      (local.get $val)
    )
    (if
      (result i32)
      (i32.eq
        (i32.load
          (local.get $var_20978)
        )
        (i32.const 0)
      )
      (then
        (local.set
          $a
          (i32.load
            (i32.add
              (local.get $var_20978)
              (i32.const 4)
            )
          )
        )
        (local.set
          $b
          (i32.load
            (i32.add
              (local.get $var_20978)
              (i32.const 8)
            )
          )
        )
        (local.get $a)
      )
      (else
        (if
          (result i32)
          (i32.eq
            (i32.load
              (local.get $var_20978)
            )
            (i32.const 1)
          )
          (then
            (i32.const 0)
          )
          (else
            (unreachable)
          )
        )
      )
    )
  )
  (export
    "_start"
    (func $_start)
  )
)
